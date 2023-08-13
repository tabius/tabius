import {AsyncStore, KV} from './async-store';

const MAX_KEY_CHAR = '~';

/** Indexed DB bases store adapter. */
export class IndexedDbAsyncStore implements AsyncStore {
  constructor(private readonly indexDbName: string,
              private readonly objectStoreName: string,
              private readonly schemaVersion = 1,
              private readonly upgradeCallback?: (db: IDBDatabase, event: IDBVersionChangeEvent) => void) {
  }

  get<T = unknown>(key: string): Promise<T|undefined> {
    return new Promise<T|undefined>((resolve, reject) => {
      this.execute(db => {
        const request: IDBRequest = db.transaction(this.objectStoreName).objectStore(this.objectStoreName).get(key);
        request.onerror = err => {
          //TODO: do not log to console.
          console.error(`IndexDB::get() error! Store: ${(this.objectStoreName)}, key:${key}`, err);
          reject();
        };
        request.onsuccess = () => resolve(request.result ? request.result.value : undefined);
      });
    });
  }

  getAll<T = unknown>(keys: readonly string[]): Promise<(T|undefined)[]> {
    if (keys.length === 0) {
      return Promise.resolve([]);
    }
    return new Promise<(T|undefined)[]>((resolve, reject) => {
      this.execute(db => {
        const store = db.transaction(this.objectStoreName).objectStore(this.objectStoreName);
        const resultValues = new Array<T|undefined>(keys.length);
        let nFinished = 0;
        for (let i = 0; i < keys.length; i++) {
          const idx = i;
          const request: IDBRequest = store.get(keys[i]);
          request.onerror = err => {
            //TODO: do not log to console.
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

  set<T = unknown>(key: string, value: T|undefined): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.execute(db => {
        if (value === undefined) {
          const request = db.transaction(this.objectStoreName, 'readwrite').objectStore(this.objectStoreName).delete(key);
          request.onerror = err => {
            //TODO: do not log to console.
            console.error(`IndexDb.delete error in ${(this.objectStoreName)}!`, err);
            reject();
          };
          request.onsuccess = () => resolve(undefined);
        } else {
          const request = db.transaction(this.objectStoreName, 'readwrite').objectStore(this.objectStoreName).put({key: key, value: value});
          request.onerror = err => {
            //TODO: do not log to console.
            console.error(`IndexDb.put error in ${(this.objectStoreName)}!`, err);
            reject();
          };
          request.onsuccess = () => resolve();
        }
      });
    });
  }

  setAll<T = unknown>(map: { [p: string]: T }): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.execute(db => {
        const tx = db.transaction(this.objectStoreName, 'readwrite');
        tx.onerror = err => {
          //TODO: do not log to console.
          console.error(`IndexDb.add error in ${(this.objectStoreName)}!`, err);
          reject();
        };
        tx.oncomplete = () => resolve();

        const store = tx.objectStore(this.objectStoreName);
        for (const [key, value] of Object.entries(map)) {
          store.put({key, value});
        }
      });
    });
  }

  list<T = unknown>(keyPrefix?: string): Promise<KV<T>[]> {
    return new Promise<KV<T>[]>((resolve, reject) => {
      this.execute(db => {
        const safeKeyPrefix = keyPrefix || '';
        const query: IDBKeyRange = IDBKeyRange.bound(safeKeyPrefix, safeKeyPrefix + MAX_KEY_CHAR);
        const request = db.transaction(this.objectStoreName).objectStore(this.objectStoreName).getAll(query);
        request.onerror = err => {
          console.error(`IndexDb.list error in ${(this.objectStoreName)}!`, err);
          reject();
        };
        request.onsuccess = () => resolve(request.result.map(e => ({key: e.key, value: e.value})));
      });
    });
  }

  clear(): Promise<void> {
    const objectStoreName = this.objectStoreName;
    return new Promise<void>((resolve, reject) => {
      this.execute(db => {
        const request = db.transaction(objectStoreName, 'readwrite')
            .objectStore(objectStoreName)
            .clear();
        request.onerror = err => {
          console.error(`IndexDb.clean error in ${objectStoreName}!`, err);
          reject();
        };
        request.onsuccess = () => resolve();
      });
    });
  }

  snapshot(): KV<unknown>[] {
    throw new Error('Not supported');
  }

  execute(dbOpCallback: (idb: IDBDatabase) => void): void {
    const request: IDBOpenDBRequest = window.indexedDB.open(this.indexDbName, this.schemaVersion);
    request.onerror = err => console.error(err); //TODO: report errors.
    request.onsuccess = () => dbOpCallback(request.result);
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db: IDBDatabase = (event.currentTarget as any).result;
      if (this.upgradeCallback) {
        this.upgradeCallback(db, event);
      } else if (!db.objectStoreNames.contains(this.objectStoreName)) {
        db.createObjectStore(this.objectStoreName, {keyPath: 'key'});
      }
    };
  }

}
