import {Inject, Injectable, PLATFORM_ID} from '@angular/core';
import {makeStateKey, TransferState} from '@angular/platform-browser';
import {APP_STORE_NAME, CATALOG_STORE_NAME, USER_STORE_NAME} from '@app/app-constants';
import {isPlatformBrowser} from '@angular/common';
import {AsyncStore, IndexedDbAsyncStore, InMemoryAsyncStore, LocalStorageAsyncStore, TransferStateAdapter} from '@app/store';
import {ObservableStoreImpl} from '@app/store/observable-store-impl';

const INDEX_DB_NAME = 'tabius';
const INDEX_DB_SCHEMA_VERSION = 7;

function isIE11(): boolean {
  return !!window['MSInputMethodContext'] && !!document['documentMode'];
}

// schema upgrade callbacks clears the store today.
function upgradeIndexDb(db: IDBDatabase, event: IDBVersionChangeEvent): void {
  if (event.oldVersion === 0) {
    db.createObjectStore(USER_STORE_NAME, {keyPath: 'key'});
    db.createObjectStore(CATALOG_STORE_NAME, {keyPath: 'key'});
    return;
  }
  for (const storeName of [USER_STORE_NAME, CATALOG_STORE_NAME]) {
    const request = db.transaction(storeName).objectStore(storeName).clear();
    request.onerror = err => {
      console.error(`IndexDb.clean error in ${storeName}!`, err);
      throw new Error(`IndexDb.clean error in ${storeName}!`);
    };
  }
}

function newUserOrCatalogAsyncStoreFactory(storeName: string, isBrowser: boolean): () => AsyncStore {
  return () => {
    return isBrowser && !isIE11()
           ? new IndexedDbAsyncStore(INDEX_DB_NAME, storeName, INDEX_DB_SCHEMA_VERSION, upgradeIndexDb)
           : new InMemoryAsyncStore();
  };
}

class AngularTransferStateAdapter implements TransferStateAdapter {
  constructor(private readonly serverState: TransferState,
              private readonly storeName: string,
              private readonly isBrowser: boolean) {

  }

  getInitialStoreState(): { [p: string]: unknown }|undefined {
    const serverStateKey = makeStateKey(`db-${this.storeName}`);
    return this.isBrowser ? this.serverState.get(serverStateKey, {}) : undefined;
  }

  setSnapshotProvider(snapshotProvider: () => object): void {
    if (!this.isBrowser) {
      const serverStateKey = makeStateKey(`db-${this.storeName}`);
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
  constructor(@Inject(PLATFORM_ID) platformId: string, serverState: TransferState) {
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
  constructor(@Inject(PLATFORM_ID) platformId: string, serverState: TransferState) {
    super(
        newUserOrCatalogAsyncStoreFactory(CATALOG_STORE_NAME, isPlatformBrowser(platformId)),
        new AngularTransferStateAdapter(serverState, CATALOG_STORE_NAME, isPlatformBrowser(platformId)),
        CATALOG_STORE_NAME,
        isPlatformBrowser(platformId),
    );
  }
}

/** Technical application specific data that must persist in the current browser between sessions. */
@Injectable()
export class AppBrowserStore extends TabiusObservableStoreImpl {
  constructor(@Inject(PLATFORM_ID) platformId: string, serverState: TransferState) {
    super(
        () => isPlatformBrowser(platformId) ? new LocalStorageAsyncStore(APP_STORE_NAME) : new InMemoryAsyncStore(),
        new AngularTransferStateAdapter(serverState, APP_STORE_NAME, isPlatformBrowser(platformId)),
        APP_STORE_NAME,
        isPlatformBrowser(platformId)
    );
  }
}
