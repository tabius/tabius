/** Browser storage with optimized interface to be used both on server & client sides.*/
import {combineLatest, Observable, of, ReplaySubject} from 'rxjs';
import {Inject, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {KV, StoreAdapter} from '@app/store/store-adapter';
import {IndexedDbStoreAdapter} from '@app/store/indexed-db-store-adapter';
import {LocalStorageStoreAdapter} from '@app/store/local-storage-store-adapter';
import {makeStateKey, StateKey, TransferState} from '@angular/platform-browser';
import {InMemoryStoreAdapter} from '@app/store/in-memory-store-adapter';
import {ARTISTS_STORE_SCHEMA_VERSION} from '@common/artist-model';
import {APP_STORE_NAME, ARTISTS_STORE_NAME, USER_STORE_NAME} from '@common/constants';
import {USERS_STORE_SCHEMA_VERSION} from '@common/user-model';
import {catchError, map, take} from 'rxjs/operators';
import {fromPromise} from 'rxjs/internal-compatibility';

const SERVER_STATE_TIMESTAMP_KEY = 'server-state-timestamp';

/** Returns true if old value is different from new. */
export type NeedUpdateFn<T> = (oldValue?: T, newValue?: T) => boolean;
export type FetchFn<T> = () => Observable<T|undefined>;

export const DO_NOT_PREFETCH = undefined;

/** Lazy refresh (re-fetch) modes for get operation. */
export enum RefreshMode {
  /** The key is never re-fetched. */
  DoNotRefresh = 1,
  /** The key is fetched if it not was fetched during the session before. */
  RefreshOncePerSession = 2,
  /** The key is fetched. */
  Refresh = 3
}

export interface ObservableStore {
  /**
   * Returns observable for the key.
   * @param key - key of the value. 'undefined' key will result to no-op.
   * @param fetchFn - optional fetch function. If value was never seen before fetch() will be called.
   * @param refreshMode - defines how to refresh value. fetchFn is used to get the refreshed value.
   * @param needUpdateFn - compares existing & refreshed values and return false if the update should be ignored.
   */
  get<T>(key: string|undefined,
         fetchFn: FetchFn<T>|undefined,
         refreshMode: RefreshMode,
         needUpdateFn: NeedUpdateFn<T>,
  ): Observable<T|undefined>;

  /**
   * Updates value in the DB.
   * @param key - key of the value. 'undefined' key will result to no-op.
   * @param value - the value to set. 'undefined' value will trigger entry removal from the DB.
   * @param needUpdateFn -  used to check if the old value equal to the new value. If values are equal -> set will result to no-op.
   */
  set<T>(key: string|undefined, value: T|undefined, needUpdateFn: NeedUpdateFn<T>): Promise<void>;

  remove<T>(key: string|undefined): Promise<void>;

  /** Lists all values by key prefix. */
  list<T>(keyPrefix: string): Promise<KV<T>[]>;

  clear(): Promise<void>;

  initialized$$: Promise<void>;
}

/** Low level key->value storage. */
class ObservableStoreImpl implements ObservableStore {
  private markAsInitialized?: () => void;
  readonly initialized$$ = new Promise<void>(resolve => this.markAsInitialized = resolve);

  private readonly dataMap = new Map<string, ReplaySubject<any>>();
  /** Set of refreshed during current session ids. */
  private readonly refreshSet = new Set<string>();
  private readonly serverStateKey: StateKey<any>;
  private readonly storeAdapter$$: Promise<StoreAdapter>;

  constructor(storeName: string,
              browser: boolean,
              serverState: TransferState,
              schemaVersion: number,
              forceLocalStorageInBrowser = false,
              private readonly freezeFn = noFreeze) {
    this.serverStateKey = makeStateKey(`db-${storeName}`);
    this.storeAdapter$$ = new Promise<StoreAdapter>(resolve => {
      const adapter = browser
          ? window.indexedDB && !forceLocalStorageInBrowser
              ? new IndexedDbStoreAdapter(storeName)
              : new LocalStorageStoreAdapter(storeName)
          : new InMemoryStoreAdapter();

      const t0 = Date.now();
      adapter.init(schemaVersion).then(() => {
        if (browser) {
          const serverStateValue = serverState.get(this.serverStateKey, {});
          this.updateDbStateFromServerState(adapter, serverStateValue).then(() => {
            console.debug(`[${storeName}] store init time: ${Date.now() - t0}ms`);
            resolve(adapter);
            this.markAsInitialized!();
          });
        } else {
          const map = (adapter as InMemoryStoreAdapter).map;
          map.set(SERVER_STATE_TIMESTAMP_KEY, new Date().toUTCString());
          serverState.onSerialize(this.serverStateKey, () => mapToObject(map));
          resolve(adapter);
          this.markAsInitialized!();
        }
      });
    });
  }

  get<T>(key: string|undefined,
         fetchFn: FetchFn<T>|undefined,
         refreshMode: RefreshMode,
         needUpdateFn: NeedUpdateFn<T>,
  ): Observable<T|undefined> {
    if (!key) {
      return of(undefined);
    }
    let rs$ = this.dataMap.get(key);
    if (rs$) {
      this.refresh(key, fetchFn, refreshMode, needUpdateFn);
      return rs$;
    }
    rs$ = this.newReplaySubject(key);
    const firstGetOp$$ = this.handleFirstGet(key, rs$, fetchFn, refreshMode, needUpdateFn);
    const firstGetOp$: Observable<void> = fromPromise(firstGetOp$$);
    return combineLatest([firstGetOp$, rs$]).pipe(map(([, rs]) => rs));
  }

  /** Note: This method is called only on the first access to the value during the app session. */
  private async handleFirstGet<T>(key: string,
                                  rs$: ReplaySubject<T|undefined>,
                                  fetchFn: FetchFn<T>|undefined,
                                  refreshMode: RefreshMode,
                                  needUpdateFn: NeedUpdateFn<T>): Promise<void> {
    const store = await this.storeAdapter$$;
    let value = await store.get<T>(key);
    if (value) {
      rs$.next(this.freezeFn(value));
      this.refresh(key, fetchFn, refreshMode, needUpdateFn);
      return;
    }
    if (fetchFn) {
      value = await fetchAndFallbackToUndefined(fetchFn);
    }
    await this.set(key, value, needUpdateFn);
  }

  // refresh action is performed async (non-blocking).
  private refresh<T>(key: string, fetchFn: FetchFn<T>|undefined, refreshMode: RefreshMode, needUpdateFn: NeedUpdateFn<T>): void {
    if (!fetchFn || refreshMode === RefreshMode.DoNotRefresh || (refreshMode === RefreshMode.RefreshOncePerSession && this.refreshSet.has(key))) {
      return;
    }
    fetchAndFallbackToUndefined(fetchFn).then(value => {
      if (value !== undefined) {
        this.set(key, value, needUpdateFn).catch(err => console.error(err));
      }
    }); // fetch and refresh it asynchronously.
  }

  private newReplaySubject<T>(key: string, initValue?: T): ReplaySubject<T|undefined> {
    const rs$ = new ReplaySubject<T|undefined>(1);
    this.dataMap.set(key, rs$);
    if (initValue !== undefined) {
      rs$.next(this.freezeFn(initValue));
    }
    return rs$;
  }

  async set<T>(key: string|undefined, value: T|undefined, needUpdateFn: NeedUpdateFn<T>): Promise<void> {
    if (!key) {
      return;
    }
    const inRefreshSet = this.refreshSet.has(key);
    const store = await this.storeAdapter$$;
    if (needUpdateFn !== skipUpdateCheck) {
      const oldValue = await store.get<T>(key);
      if (!needUpdateFn(oldValue, value)) {
        const firstUpdate = !inRefreshSet;
        const forceUpdate = firstUpdate && value === undefined && oldValue === undefined;
        if (!forceUpdate) {
          return;
        }
      }
    }
    if (!inRefreshSet) {
      this.refreshSet.add(key);
    }
    await store.set(key, value);
    const rs$ = this.dataMap.get(key);
    if (rs$) {
      rs$.next(this.freezeFn(value));
    }
  }

  async remove<T>(key: string|undefined): Promise<void> {
    this.set(key, undefined, skipUpdateCheck);
  }

  async list<T>(keyPrefix: string): Promise<KV<T>[]> {
    const store = await this.storeAdapter$$;
    return store.list(keyPrefix);
  }

  async clear(): Promise<void> {
    const store = await this.storeAdapter$$;
    this.dataMap.forEach(subj$ => subj$.next(undefined));
    return store.clear();
  }

  /**
   * When PWA is initialized it receives server state as an input. This server state may already be outdated (new data is fetched by AJAX).
   * This method checks if the state is new (never seen before) and runs DB data update only if server state was never seen before.
   */
  private async updateDbStateFromServerState(adapter: StoreAdapter, serverState: any): Promise<void> {
    const serverStateTimestamp = serverState[SERVER_STATE_TIMESTAMP_KEY];
    const dbVersionOfServerState = await adapter.get(SERVER_STATE_TIMESTAMP_KEY);
    if (serverStateTimestamp === dbVersionOfServerState) {
      console.debug(`Ignoring server state update. Key: ${dbVersionOfServerState}`);
      return;
    }
    await adapter.setAll(serverState);
    for (const [key, value] of Object.entries(serverState)) { // instantiate subjects -> they will be needed on browser re-render.
      this.newReplaySubject(key, value);
      this.refreshSet.add(key);
    }
  }
}

function mapToObject(map: Map<string, any>): { [key: string]: any } {
  const res: any = {};
  for (const [key, value] of map.entries()) {
    res[key] = value;
  }
  return res;
}

/** Store for user's personal settings and playlists. */
export class UserBrowserStore extends ObservableStoreImpl {
  constructor(@Inject(PLATFORM_ID) platformId: string, serverState: TransferState) {
    super(USER_STORE_NAME, isPlatformBrowser(platformId), serverState, USERS_STORE_SCHEMA_VERSION);
  }
}

/** Store with artist & songs. */
export class ArtistsBrowserStore extends ObservableStoreImpl {
  constructor(@Inject(PLATFORM_ID) platformId: string, serverState: TransferState) {
    super(ARTISTS_STORE_NAME, isPlatformBrowser(platformId), serverState, ARTISTS_STORE_SCHEMA_VERSION);
  }
}

/** Technical application specific data that must persist in the current browser between sessions. */
export class AppBrowserStore extends ObservableStoreImpl {
  constructor(@Inject(PLATFORM_ID) platformId: string, serverState: TransferState) {
    super(APP_STORE_NAME, isPlatformBrowser(platformId), serverState, 1, true);
  }
}

function noFreeze<T>(obj: T|undefined): T|undefined {
  return obj;
}

// noinspection JSUnusedLocalSymbols,JSUnusedGlobalSymbols
export function deepFreeze<T>(obj: T|undefined): T|undefined {
  if (obj === undefined) {
    return undefined;
  }
  Object.freeze(obj);
  for (const prop of Object.getOwnPropertyNames(obj)) {
    const value = obj[prop];
    if ((typeof value === 'object' || typeof value === 'function') && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj;
}

function fetchAndFallbackToUndefined<T>(fetchFn: (() => Observable<T|undefined>)): Promise<T|undefined> {
  return fetchFn().pipe(
      take(1),
      catchError(() => of(undefined)),
  ).toPromise();
}

export function skipUpdateCheck(): boolean {
  throw 'This is a marker function that must never be called!';
}

