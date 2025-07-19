import { AsyncStore, KV } from './async-store';

/** Indexed DB bases store adapter. */
export class IndexedDbAsyncStore implements AsyncStore {
  constructor(
    private readonly indexDbName: string,
    private readonly objectStoreName: string,
    private readonly schemaVersion = 1,
    private readonly upgradeCallback?: (db: IDBDatabase, event: IDBVersionChangeEvent) => void,
  ) {}

  get<T = unknown>(key: string): Promise<T | undefined> {
    return new Promise<T | undefined>((resolve, reject) => {
      this.execute(db => {
        const request: IDBRequest = db.transaction(this.objectStoreName).objectStore(this.objectStoreName).get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result ? request.result.value : undefined);
      }, reject);
    });
  }

  getAll<T = unknown>(keys: readonly string[]): Promise<(T | undefined)[]> {
    if (keys.length === 0) {
      return Promise.resolve([]);
    }
    return new Promise<(T | undefined)[]>((resolve, reject) => {
      this.execute(db => {
        const tx = db.transaction(this.objectStoreName);
        const store = tx.objectStore(this.objectStoreName);
        const resultValues = new Map<string, T>();

        tx.oncomplete = () => resolve(keys.map(k => resultValues.get(k)));
        tx.onerror = () => reject(tx.error);

        // Fire all 'get' requests.
        for (const key of keys) {
          const request: IDBRequest = store.get(key);
          request.onsuccess = () => {
            if (request.result) {
              resultValues.set(request.result.key, request.result.value);
            }
          };
        }
      }, reject);
    });
  }

  set<T = unknown>(key: string, value: T | undefined): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.execute(db => {
        const tx = db.transaction(this.objectStoreName, 'readwrite');
        const store = tx.objectStore(this.objectStoreName);

        if (value === undefined) {
          store.delete(key);
        } else {
          store.put({ key, value });
        }

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }, reject);
    });
  }

  setAll<T = unknown>(map: { [p: string]: T }): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.execute(db => {
        const tx = db.transaction(this.objectStoreName, 'readwrite');
        const store = tx.objectStore(this.objectStoreName);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        for (const [key, value] of Object.entries(map)) {
          store.put({ key, value });
        }
      }, reject);
    });
  }

  list<T = unknown>(keyPrefix?: string): Promise<KV<T>[]> {
    return new Promise<KV<T>[]>((resolve, reject) => {
      this.execute(db => {
        const safeKeyPrefix = keyPrefix || '';
        // Use `\uffff` for a correct prefix range query.
        const query: IDBKeyRange = IDBKeyRange.bound(safeKeyPrefix, safeKeyPrefix + '\uffff');
        const request = db.transaction(this.objectStoreName).objectStore(this.objectStoreName).getAll(query);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result); // Result is already {key, value}[].
      }, reject);
    });
  }

  clear(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.execute(db => {
        const request = db.transaction(this.objectStoreName, 'readwrite').objectStore(this.objectStoreName).clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      }, reject);
    });
  }

  snapshot(): KV<unknown>[] {
    throw new Error('Not supported');
  }

  execute(dbOpCallback: (idb: IDBDatabase) => void, reject: (reason?: any) => void): void {
    const request: IDBOpenDBRequest = window.indexedDB.open(this.indexDbName, this.schemaVersion);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => dbOpCallback(request.result);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db: IDBDatabase = (event.currentTarget as any).result;
      if (this.upgradeCallback) {
        this.upgradeCallback(db, event);
      } else if (!db.objectStoreNames.contains(this.objectStoreName)) {
        db.createObjectStore(this.objectStoreName, { keyPath: 'key' });
      }
    };
  }
}
