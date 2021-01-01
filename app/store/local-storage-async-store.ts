/**
 * Local storage backed store adapter.
 * Note: has memory limits: 2-5Mb.
 */
import {AsyncStore, KV} from './async-store';

export class LocalStorageAsyncStore implements AsyncStore {
  constructor(private readonly storeKeyPrefix) {
  }

  get<T = unknown>(key: string): Promise<T|undefined> {
    return Promise.resolve(LocalStorageAsyncStore._get(this.convertUserKeyToStoreKey(key)));
  }

  getAll<T = unknown>(keys: readonly string[]): Promise<(T|undefined)[]> {
    return new Promise<(T|undefined)[]>(resolve => {
      const result = keys.map(key => LocalStorageAsyncStore._get<T>(this.convertUserKeyToStoreKey(key)));
      resolve(result);
    });
  }

  set<T = unknown>(key: string, value: T|undefined): Promise<void> {
    return new Promise<void>(resolve => {
      LocalStorageAsyncStore._set(this.convertUserKeyToStoreKey(key), value);
      resolve();
    });
  }

  setAll<T = unknown>(map: { [p: string]: T }): Promise<void> {
    return new Promise<void>(resolve => {
      for (const [key, value] of Object.entries(map)) {
        LocalStorageAsyncStore._set(this.convertUserKeyToStoreKey(key), value);
      }
      resolve();
    });
  }

  private static _get<T = unknown>(storeKey: string): T|undefined {
    const serializedValue = window.localStorage.getItem(storeKey);
    return serializedValue === null ? undefined : JSON.parse(serializedValue);
  }

  private static _set<T = unknown>(storeKey: string, value: T|undefined): void {
    if (value === undefined) {
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

  list<T = unknown>(keyPrefix?: string): Promise<KV<T>[]> {
    return new Promise<KV<T>[]>(resolve => {
      const storeUserKeyPrefix = this.convertUserKeyToStoreKey(keyPrefix || '');
      const result: KV<T>[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const storeKey = window.localStorage.key(i);
        if (storeKey && storeKey.startsWith(storeUserKeyPrefix)) {
          const value: T|undefined = LocalStorageAsyncStore._get(storeKey);
          if (value !== undefined) {
            result.push({key: this.convertStoreKeyToUserKey(storeKey), value});
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
        const storeKey = window.localStorage.key(i);
        if (storeKey && storeKey.startsWith(this.storeKeyPrefix)) {
          keysToRemove.push(storeKey);
        }
      }
      keysToRemove.forEach(key => window.localStorage.removeItem(key));
      return resolve();
    });
  }

  private convertUserKeyToStoreKey(userKey: string): string {
    return this.storeKeyPrefix + '-' + userKey;
  }

  private convertStoreKeyToUserKey(storeKey: string): string {
    return storeKey.substring(this.storeKeyPrefix.length + 1);
  }

  snapshot(): KV<unknown>[] {
    throw new Error('Not supported');
  }

}
