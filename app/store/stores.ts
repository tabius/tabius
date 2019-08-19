import {Inject, PLATFORM_ID} from '@angular/core';
import {TransferState} from '@angular/platform-browser';
import {APP_STORE_NAME, ARTISTS_STORE_NAME, USER_STORE_NAME} from '@common/constants';
import {isPlatformBrowser} from '@angular/common';
import {IndexedDbStoreAdapter} from '@app/store/indexed-db-store-adapter';
import {InMemoryStoreAdapter} from '@app/store/in-memory-store-adapter';
import {USERS_STORE_SCHEMA_VERSION} from '@common/user-model';
import {ARTISTS_STORE_SCHEMA_VERSION} from '@common/artist-model';
import {LocalStorageStoreAdapter} from '@app/store/local-storage-store-adapter';
import {ObservableStoreImpl} from '@app/store/observable-store-impl';

export class UserBrowserStore extends ObservableStoreImpl {
  constructor(@Inject(PLATFORM_ID) platformId: string, serverState: TransferState) {
    super(USER_STORE_NAME, isPlatformBrowser(platformId),
        (name, browser) => browser ? new IndexedDbStoreAdapter(name) : new InMemoryStoreAdapter()
        , serverState, USERS_STORE_SCHEMA_VERSION
    );
  }
}

/** Store with artist & songs. */
export class ArtistsBrowserStore extends ObservableStoreImpl {
  constructor(@Inject(PLATFORM_ID) platformId: string, serverState: TransferState) {
    super(ARTISTS_STORE_NAME, isPlatformBrowser(platformId),
        (name, browser) => browser ? new IndexedDbStoreAdapter(name) : new InMemoryStoreAdapter(),
        serverState, ARTISTS_STORE_SCHEMA_VERSION
    );
  }
}

/** Technical application specific data that must persist in the current browser between sessions. */
export class AppBrowserStore extends ObservableStoreImpl {
  constructor(@Inject(PLATFORM_ID) platformId: string, serverState: TransferState) {
    super(APP_STORE_NAME, isPlatformBrowser(platformId),
        (name, browser) => browser ? new LocalStorageStoreAdapter(name) : new InMemoryStoreAdapter(),
        serverState, 1
    );
  }
}

