import {StoreAdapter} from '@app/store/store-adapter';
import {ARTISTS_STORE_NAME, USER_STORE_NAME} from '@common/constants';

const MAX_KEY_CHAR = '~';

/** Indexed DB bases store adapter. */
export class IndexedDbStoreAdapter implements StoreAdapter {
  constructor(private readonly storeName: string) {
  }

  get<T>(key: string): Promise<T|undefined> {
    const storeName = this.storeName;
    return new Promise<T|undefined>((resolve, reject) => {
      execute(db => {
        const request: IDBRequest<any|undefined> = db.transaction(storeName)
            .objectStore(storeName)
            .get(key);
        request.onerror = err => {
          console.error('IndexDB::get() error!', err);
          reject();
        };
        request.onsuccess = () => resolve(request.result ? request.result.value : undefined);
      });
    });
  }

  getAll<T>(keys: string[]): Promise<(T|undefined)[]> {
    if (keys.length === 0) {
      return Promise.resolve([]);
    }
    const storeName = this.storeName;
    return new Promise<(T|undefined)[]>((resolve, reject) => {
      execute(db => {
        const store = db.transaction(storeName).objectStore(storeName);
        const resultValues = new Array<T|undefined>(keys.length);
        let nFinished = 0;
        for (let i = 0; i < keys.length; i++) {
          const idx = i;
          const request: IDBRequest<any|undefined> = store.get(keys[i]);
          request.onerror = err => {
            console.error('IndexDB::getAll() error!', err);
            reject();
          };
          request.onsuccess = () => {
            resultValues[idx] = request.result ? request.result.value : undefined;
            nFinished++;
            if (nFinished === keys.length) {
              return resolve(resultValues);
            }
          };
        }
      });
    });
  }


  set<T>(key: string, value: T|undefined): Promise<void> {
    const storeName = this.storeName;
    return new Promise<void>((resolve, reject) => {
      execute(db => {
        if (value) {
          const request = db.transaction(storeName, 'readwrite').objectStore(storeName).put({key: key, value: value});
          request.onerror = err => {
            console.error(`IndexDb.put error in ${storeName}!`, err);
            reject();
          };
          request.onsuccess = () => resolve();
        } else {
          const request = db.transaction(storeName, 'readwrite').objectStore(storeName).delete(key);
          request.onerror = err => {
            console.error(`IndexDb.delete error in ${storeName}!`, err);
            reject();
          };
          request.onsuccess = () => resolve(undefined);
        }
      });
    });
  }

  setAll(map: { [p: string]: any }): Promise<void> {
    const storeName = this.storeName;
    return new Promise<void>((resolve, reject) => {
      execute(db => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        for (const [key, value] of Object.entries(map)) {
          store.put({key: key, value: value});
        }
        tx.onerror = err => {
          console.error(`IndexDb.add error in ${storeName}!`, err);
          reject();
        };
        tx.oncomplete = () => resolve();
      });
    });
  }


  list<T>(keyPrefix: string): Promise<T[]> {
    const storeName = this.storeName;
    return new Promise<T[]>((resolve, reject) => {
      execute(db => {
        const query: IDBKeyRange = IDBKeyRange.bound(keyPrefix, keyPrefix + MAX_KEY_CHAR);
        const request = db.transaction(storeName).objectStore(storeName).getAll(query);
        request.onerror = err => {
          console.error(`IndexDb.list error in ${storeName}!`, err);
          reject();
        };
        request.onsuccess = () => resolve(request.result.map(e => e.value));
      });
    });
  }

  clear(): Promise<void> {
    const storeName = this.storeName;
    return new Promise<void>((resolve, reject) => {
      execute(db => {
        const request = db.transaction(storeName, 'readwrite').objectStore(storeName).clear();
        request.onerror = err => {
          console.error(`IndexDb.clean error in ${storeName}!`, err);
          reject();
        };
        request.onsuccess = () => resolve();
      });
    });
  }

  async init(schemaVersion: number): Promise<void> {
    // //todo: support upgrade
    const myVersion: number|undefined = await this.get('version');
    if (myVersion != schemaVersion) {
      await this.clear();
      await this.set('version', schemaVersion);
    }
    return Promise.resolve();
  }
}

const INDEX_DB_NAME = 'tabius';
const INDEX_DB_SCHEMA_VERSION = 2;

function execute(dbOp: (db: IDBDatabase) => void): void {
  const request: IDBOpenDBRequest = window.indexedDB.open(INDEX_DB_NAME, INDEX_DB_SCHEMA_VERSION);
  request.onerror = err => console.error(err);
  request.onsuccess = () => dbOp(request.result);
  request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
    const result = (e.currentTarget as any).result;
    const objectStoreParams = {keyPath: 'key'};
    //todo: remove hardcoded store names.
    result.createObjectStore(USER_STORE_NAME, objectStoreParams);
    result.createObjectStore(ARTISTS_STORE_NAME, objectStoreParams);
  };
}
