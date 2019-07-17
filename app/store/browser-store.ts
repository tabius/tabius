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
import {map, take} from 'rxjs/operators';
import {fromPromise} from 'rxjs/internal-compatibility';

const SERVER_STATE_TIMESTAMP_KEY = 'server-state-timestamp';

/** Returns true if old value is different from new. */
export type NeedUpdateFn<T> = (oldValue?: T, newValue?: T) => boolean;

export const DO_NOT_PREFETCH = undefined;
export const DO_NOT_REFRESH = false;
export const DO_REFRESH = true;

export interface BrowserStore {
  get<T>(key: string|undefined, fetchFn: (() => Observable<T|undefined>)|undefined, refresh: boolean, needUpdateFn: NeedUpdateFn<T>|undefined): Observable<T|undefined>;

  /** Sets value. 'undefined' value will trigger entry removal. 'undefined' key will result to no-op. */
  set<T>(key: string|undefined, value: T|undefined, needUpdateFn?: NeedUpdateFn<T>): Promise<void>;

  /** Lists all values by key prefix. */
  list<T>(keyPrefix: string): Promise<KV<T>[]>;

  clear(): Promise<void>;

  initialized$$: Promise<void>;
}

/** Low level key->value storage. */
class BrowserStoreImpl implements BrowserStore {
  private markAsInitialized?: () => void;
  readonly initialized$$ = new Promise<void>(resolve => this.markAsInitialized = resolve);

  private readonly dataMap = new Map<string, ReplaySubject<any>>();
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
         fetchFn: (() => Observable<T|undefined>)|undefined,
         refresh: boolean,
         needUpdateFn: NeedUpdateFn<T>|undefined): Observable<T|undefined> {
    if (!key) {
      return of(undefined);
    }
    let rs$ = this.dataMap.get(key);
    if (rs$) {
      return rs$;
    }
    rs$ = this.newReplaySubject(key);
    const fetch$$ = this.triggerFetchIfNotCached(key, rs$, fetchFn, refresh, needUpdateFn).catch(err => console.error(err));
    const fetch$: Observable<void> = fromPromise(fetch$$);
    return combineLatest([fetch$, rs$]).pipe(map(([, rs]) => rs));
  }

  private async triggerFetchIfNotCached<T>(key: string,
                                           rs$: ReplaySubject<T|undefined>,
                                           fetchFn: (() => Observable<T|undefined>)|undefined,
                                           refresh: boolean|undefined,
                                           needUpdateFn: NeedUpdateFn<T>|undefined): Promise<void> {
    const store = await this.storeAdapter$$;
    let value = await store.get<T>(key);
    if (!value) {
      if (fetchFn) {
        value = await fetchFn().pipe(take(1)).toPromise();
        await store.set(key, value);
      }
    } else if (fetchFn && refresh) { // this is first access to the cached value. Check if asked to refresh it.
      // this action is performed async (non-blocking).
      fetchFn().pipe(take(1)).toPromise().then(value => this.set(key, value, needUpdateFn).catch(err => console.warn(err))); // fetch and refresh it asynchronously.
    }
    rs$.next(this.freezeFn(value));
  }

  private newReplaySubject<T>(key: string, initValue?: T): ReplaySubject<T|undefined> {
    const rs$ = new ReplaySubject<T|undefined>(1);
    this.dataMap.set(key, rs$);
    if (initValue !== undefined) {
      rs$.next(this.freezeFn(initValue));
    }
    return rs$;
  }

  async set<T>(key: string|undefined, value: T|undefined, needUpdateFn?: NeedUpdateFn<T>): Promise<void> {
    if (!key) {
      return;
    }
    const store = await this.storeAdapter$$;
    if (needUpdateFn) {
      const oldValue = await store.get<T>(key);
      if (!needUpdateFn(oldValue, value)) {
        return;
      }
    }
    await store.set(key, value);
    const rs$ = this.dataMap.get(key);
    if (rs$) {
      rs$.next(this.freezeFn(value));
    }
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
export class UserBrowserStore extends BrowserStoreImpl {
  constructor(@Inject(PLATFORM_ID) platformId: string, serverState: TransferState) {
    super(USER_STORE_NAME, isPlatformBrowser(platformId), serverState, USERS_STORE_SCHEMA_VERSION);
  }
}

/** Store with artist & songs. */
export class ArtistsBrowserStore extends BrowserStoreImpl {
  constructor(@Inject(PLATFORM_ID) platformId: string, serverState: TransferState) {
    super(ARTISTS_STORE_NAME, isPlatformBrowser(platformId), serverState, ARTISTS_STORE_SCHEMA_VERSION);
  }
}

/** Technical application specific data that must persist in the current browser between sessions. */
export class AppBrowserStore extends BrowserStoreImpl {
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
