import { Injectable, makeStateKey, PLATFORM_ID, TransferState, inject } from '@angular/core';
import { APP_STORE_NAME, CATALOG_STORE_NAME, USER_STORE_NAME } from '@app/app-constants';
import { isPlatformBrowser } from '@angular/common';
import { AsyncStore, IndexedDbAsyncStore, InMemoryAsyncStore, LocalStorageAsyncStore, TransferStateAdapter } from '@app/store';
import { ObservableStoreImpl } from '@app/store/observable-store-impl';
import { environment } from '@app/environments/environment';

const INDEX_DB_NAME = `tabius_${environment.app}`;
const INDEX_DB_SCHEMA_VERSION = 8;

/** Upgrades in-browser database schema: implemented as a simple 'clear' today. */
function upgradeIndexDb(db: IDBDatabase, event: IDBVersionChangeEvent): void {
  if (event.oldVersion === 0) {
    db.createObjectStore(USER_STORE_NAME, { keyPath: 'key' });
    db.createObjectStore(CATALOG_STORE_NAME, { keyPath: 'key' });
    return;
  }
  for (const storeName of [USER_STORE_NAME, CATALOG_STORE_NAME]) {
    const request = db.transaction(storeName).objectStore(storeName).clear();
    request.onerror = (err): void => {
      console.error(`IndexDb.clean error in ${storeName}!`, err);
      throw new Error(`IndexDb.clean error in ${storeName}!`);
    };
  }
}

function newUserOrCatalogAsyncStoreFactory(storeName: string, isBrowser: boolean): () => AsyncStore {
  return () => {
    return isBrowser
      ? new IndexedDbAsyncStore(INDEX_DB_NAME, storeName, INDEX_DB_SCHEMA_VERSION, upgradeIndexDb)
      : new InMemoryAsyncStore();
  };
}

class AngularTransferStateAdapter implements TransferStateAdapter {
  constructor(
    private readonly serverState: TransferState,
    private readonly storeName: string,
    private readonly isBrowser: boolean,
  ) {}

  async initialize(asyncStore: AsyncStore): Promise<{ [p: string]: unknown } | undefined> {
    if (!this.isBrowser) {
      return undefined;
    }
    const serverStateKey = makeStateKey<{ [p: string]: unknown }>(`db-${this.storeName}`);
    const serverState = this.serverState.get<{ [p: string]: unknown }>(serverStateKey, {});
    await asyncStore.setAll(serverState);
    return serverState;
  }

  setSnapshotProvider(snapshotProvider: () => object): void {
    if (!this.isBrowser) {
      const serverStateKey = makeStateKey<object>(`db-${this.storeName}`);
      this.serverState.set(serverStateKey, {});
      this.serverState.onSerialize(serverStateKey, snapshotProvider);
    }
  }
}

class TabiusObservableStoreImpl extends ObservableStoreImpl {
  private initializationStartTime = Date.now();

  constructor(
    asyncStoreFactory: () => AsyncStore,
    transferStateAdapter: TransferStateAdapter,
    storeName: string,
    isBrowser: boolean,
  ) {
    super(asyncStoreFactory, transferStateAdapter);
    if (isBrowser) {
      this.initialized$$.then(() => {
        console.debug(`[${storeName}] init time ${Date.now() - this.initializationStartTime} ms`);
      });
    }
  }
}

@Injectable()
export class UserBrowserStore extends TabiusObservableStoreImpl {
  constructor() {
    const platformId = inject(PLATFORM_ID);
    const serverState = inject(TransferState);

    super(
      newUserOrCatalogAsyncStoreFactory(USER_STORE_NAME, isPlatformBrowser(platformId)),
      new AngularTransferStateAdapter(serverState, USER_STORE_NAME, isPlatformBrowser(platformId)),
      USER_STORE_NAME,
      isPlatformBrowser(platformId),
    );
  }
}

/** Store with collections & songs. */
@Injectable()
export class CatalogBrowserStore extends TabiusObservableStoreImpl {
  constructor() {
    const platformId = inject(PLATFORM_ID);
    const serverState = inject(TransferState);

    super(
      newUserOrCatalogAsyncStoreFactory(CATALOG_STORE_NAME, isPlatformBrowser(platformId)),
      new AngularTransferStateAdapter(serverState, CATALOG_STORE_NAME, isPlatformBrowser(platformId)),
      CATALOG_STORE_NAME,
      isPlatformBrowser(platformId),
    );
  }
}

/** Technical application-specific data that must persist in the current browser between sessions. */
@Injectable()
export class AppBrowserStore extends TabiusObservableStoreImpl {
  constructor() {
    const platformId = inject(PLATFORM_ID);
    const serverState = inject(TransferState);

    super(
      () => (isPlatformBrowser(platformId) ? new LocalStorageAsyncStore(APP_STORE_NAME) : new InMemoryAsyncStore()),
      new AngularTransferStateAdapter(serverState, APP_STORE_NAME, isPlatformBrowser(platformId)),
      APP_STORE_NAME,
      isPlatformBrowser(platformId),
    );
  }
}
