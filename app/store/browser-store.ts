/** Browser storage with optimized interface to be used both on server & client sides.*/
import {Observable, ReplaySubject} from 'rxjs';
import {Inject, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {StoreAdapter} from '@app/store/store-adapter';
import {IndexedDbStoreAdapter} from '@app/store/indexed-db-store-adapter';
import {LocalStorageStoreAdapter} from '@app/store/local-storage-store-adapter';
import {makeStateKey, StateKey, TransferState} from '@angular/platform-browser';
import {InMemoryStoreAdapter} from '@app/store/in-memory-store-adapter';
import {ARTISTS_STORE_SCHEMA_VERSION} from '@common/artist-model';
import {APP_STORE_NAME, ARTISTS_STORE_NAME, USER_STORE_NAME} from '@common/constants';
import {USERS_STORE_SCHEMA_VERSION} from '@common/user-model';

const SERVER_STATE_TIMESTAMP_KEY = 'server-state-timestamp';

/** Returns true if old value is different from new. */
export type NeedUpdateFn<T> = (oldValue?: T, newValue?: T) => boolean;

export interface BrowserStore {
  get<T>(key: string): Observable<T|undefined>;

  /** Sets value. 'undefined' will trigger entry removal. */
  set<T>(key: string, value: T|undefined, needUpdateFn?: NeedUpdateFn<T>): Promise<void>;

  /** Lists all values by key prefix. */
  list<T>(keyPrefix: string): Promise<T[]>;

  clear(): Promise<void>;

  /**
   * Returns true if the value was updated during the session.
   * Note: clear() call resets all isUpdated flags.
   */
  isUpdated(key: string): boolean;

  initialized$$: Promise<void>;
}

/** Low level key->value storage. */
class BrowserStoreImpl implements BrowserStore {
  private markAsInitialized?: () => void;
  readonly initialized$$ = new Promise<void>(resolve => this.markAsInitialized = resolve);

  private readonly dataMap = new Map<string, ReplaySubject<any>>();
  private readonly updatedKeys = new Set<string>();
  private readonly serverStateKey: StateKey<any>;
  private readonly storeAdapter$$: Promise<StoreAdapter>;

  constructor(storeName: string, browser: boolean, serverState: TransferState, schemaVersion: number, forceLocalStorageInBrowser = false) {
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

  get<T>(key: string): Observable<T|undefined> {
    let rs$ = this.dataMap.get(key);
    if (!rs$) {
      rs$ = this.newReplaySubject(key);
      this.storeAdapter$$.then(store => store.get(key).then(value => rs$!.next(value)));
    }
    return rs$;
  }

  private newReplaySubject<T>(key: string, initValue?: T): ReplaySubject<T|undefined> {
    const rs$ = new ReplaySubject<T|undefined>(1);
    this.dataMap.set(key, rs$);
    if (initValue !== undefined) {
      rs$.next(initValue);
    }
    return rs$;
  }

  async set<T>(key: string, value: T|undefined, needUpdateFn?: NeedUpdateFn<T>): Promise<void> {
    const store = await this.storeAdapter$$;
    this.updatedKeys.add(key);
    if (needUpdateFn) {
      const oldValue = await store.get<T>(key);
      if (!needUpdateFn(oldValue, value)) {
        return;
      }
    }
    return store.set(key, value).then(() => {
      const rs$ = this.dataMap.get(key);
      if (rs$) {
        rs$.next(value);
      }
    });
  }

  async list<T>(keyPrefix: string): Promise<T[]> {
    const store = await this.storeAdapter$$;
    return store.list(keyPrefix);
  }

  async clear(): Promise<void> {
    const store = await this.storeAdapter$$;
    this.dataMap.forEach(subj$ => subj$.next(undefined));
    this.updatedKeys.clear();
    return store.clear();
  }

  isUpdated(key: string): boolean {
    return this.updatedKeys.has(key);
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
