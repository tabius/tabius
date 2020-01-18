import {Inject, Injectable, PLATFORM_ID} from '@angular/core';
import {TransferState} from '@angular/platform-browser';
import {APP_STORE_NAME, CATALOG_STORE_NAME, USER_STORE_NAME} from '@app/app-constants';
import {isPlatformBrowser} from '@angular/common';
import {IndexedDbStoreAdapter} from '@app/store/indexed-db-store-adapter';
import {InMemoryStoreAdapter} from '@app/store/in-memory-store-adapter';
import {USERS_STORE_SCHEMA_VERSION} from '@common/user-model';
import {CATALOG_STORE_SCHEMA_VERSION} from '@common/catalog-model';
import {LocalStorageStoreAdapter} from '@app/store/local-storage-store-adapter';
import {ObservableStoreImpl} from '@app/store/observable-store-impl';

@Injectable()
export class UserBrowserStore extends ObservableStoreImpl {
  constructor(@Inject(PLATFORM_ID) platformId: string, serverState: TransferState) {
    super(USER_STORE_NAME, isPlatformBrowser(platformId),
        (name, browser) => browser ? new IndexedDbStoreAdapter(name) : new InMemoryStoreAdapter()
        , serverState, USERS_STORE_SCHEMA_VERSION
    );
  }
}

/** Store with collections & songs. */
@Injectable()
export class CatalogBrowserStore extends ObservableStoreImpl {
  constructor(@Inject(PLATFORM_ID) platformId: string, serverState: TransferState) {
    super(CATALOG_STORE_NAME, isPlatformBrowser(platformId),
        (name, browser) => browser ? new IndexedDbStoreAdapter(name) : new InMemoryStoreAdapter(),
        serverState, CATALOG_STORE_SCHEMA_VERSION
    );
  }
}

/** Technical application specific data that must persist in the current browser between sessions. */
@Injectable()
export class AppBrowserStore extends ObservableStoreImpl {
  constructor(@Inject(PLATFORM_ID) platformId: string, serverState: TransferState) {
    super(APP_STORE_NAME, isPlatformBrowser(platformId),
        (name, browser) => browser ? new LocalStorageStoreAdapter(name) : new InMemoryStoreAdapter(),
        serverState, 1
    );
  }
}

