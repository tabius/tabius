/**
 * Local storage backed store adapter.
 * Note: has memory limits: 2-5Mb.
 */
import {StoreAdapter} from '@app/store/store-adapter';

export class LocalStorageStoreAdapter implements StoreAdapter {
  constructor(private readonly keyPrefix: string) {
  }

  get<T>(key: string): Promise<T|undefined> {
    return Promise.resolve(this.getAndParse(key));
  }

  getAll<T>(keys: string[]): Promise<(T|undefined)[]> {
    return new Promise<(T|undefined)[]>(resolve => {
      const result: (T|undefined)[] = [];
      for (const key of keys) {
        result.push(this.getAndParse(key));
      }
      resolve(result);
    });
  }

  private getAndParse<T>(userKey: string): T|undefined {
    const serializedValue = window.localStorage.getItem(this.getStoreKey(userKey));
    return serializedValue != null ? JSON.parse(serializedValue) : undefined;
  }

  set<T>(key: string, value: T|undefined): Promise<void> {
    return new Promise<void>(resolve => {
      this.serializeAndSave(key, value);
      resolve();
    });
  }

  setAll(map: { [p: string]: any }): Promise<void> {
    return new Promise<void>(resolve => {
      for (const [key, value] of Object.entries(map)) {
        this.serializeAndSave(key, value);
      }
      resolve();
    });
  }

  private serializeAndSave<T>(userKey: string, value: T|undefined): void {
    const storeKey = this.getStoreKey(userKey);
    if (!value) {
      window.localStorage.removeItem(storeKey);
      return;
    }
    const jsonValue = JSON.stringify(value);
    try {
      window.localStorage.setItem(storeKey, jsonValue);
    } catch (e) {
      console.warn(`Local storage is full, failed to set key: ${storeKey}, length: ${jsonValue.length}`);
      // resolve anyway.
    }
  }

  list<T>(keyPrefix: string): Promise<T[]> {
    return new Promise<T[]>(resolve => {
      const storeKeyPrefix = this.getStoreKey(keyPrefix);
      const result: T[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(storeKeyPrefix)) {
          const value = window.localStorage.getItem(key);
          if (value != null) {
            result.push(JSON.parse(value));
          }
        }
      }
      return resolve(result);
    });
  }

  async clear(): Promise<void> {
    return new Promise<void>(resolve => {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(this.keyPrefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => window.localStorage.removeItem(key));
      return resolve();
    });
  }

  private getStoreKey(userKey: string): string {
    return this.keyPrefix + '-' + userKey;
  }

  async init(schemaVersion: number): Promise<void> {
    //todo: support upgrade
    const myVersion: number|undefined = await this.get('version');
    if (myVersion != schemaVersion) {
      await this.clear();
      await this.set('version', schemaVersion);
    }
    return Promise.resolve();
  }
}
