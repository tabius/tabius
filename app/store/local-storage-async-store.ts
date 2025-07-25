import { truthy } from 'assertic';
import { AsyncStore, KV } from './async-store';
import { fromEvent, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

/**
 * Local storage backed store adapter.
 * Note: has memory limits: 2-5Mb.
 */
export class LocalStorageAsyncStore implements AsyncStore {
  constructor(private readonly storeKeyPrefix: string) {}

  get<T = unknown>(key: string): Promise<T | undefined> {
    return Promise.resolve(LocalStorageAsyncStore._get(this.convertUserKeyToStoreKey(key)));
  }

  getAll<T = unknown>(keys: readonly string[]): Promise<(T | undefined)[]> {
    return new Promise<(T | undefined)[]>(resolve => {
      const result = keys.map(key => LocalStorageAsyncStore._get<T>(this.convertUserKeyToStoreKey(key)));
      resolve(result);
    });
  }

  set<T = unknown>(key: string, value: T | undefined): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        LocalStorageAsyncStore._set(this.convertUserKeyToStoreKey(key), value);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  setAll<T = unknown>(map: { [p: string]: T }): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        for (const [key, value] of Object.entries(map)) {
          LocalStorageAsyncStore._set(this.convertUserKeyToStoreKey(key), value);
        }
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  private static _get<T = unknown>(storeKey: string): T | undefined {
    const serializedValue = window.localStorage.getItem(storeKey);
    return serializedValue === null ? undefined : JSON.parse(serializedValue);
  }

  private static _set<T = unknown>(storeKey: string, value: T | undefined): void {
    if (value === undefined) {
      window.localStorage.removeItem(storeKey);
      return;
    }
    const jsonValue = JSON.stringify(value);
    try {
      window.localStorage.setItem(storeKey, jsonValue);
    } catch (e) {
      console.error(`Local storage is full, failed to set key: ${storeKey}, length: ${jsonValue.length}`, e);
      throw e;
    }
  }

  list<T = unknown>(keyPrefix?: string): Promise<KV<T>[]> {
    return new Promise<KV<T>[]>(resolve => {
      const storeUserKeyPrefix = this.convertUserKeyToStoreKey(keyPrefix || '');
      const result: KV<T>[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const storeKey = window.localStorage.key(i);
        if (storeKey && storeKey.startsWith(storeUserKeyPrefix)) {
          const value: T | undefined = LocalStorageAsyncStore._get(storeKey);
          if (value !== undefined) {
            result.push({ key: this.convertStoreKeyToUserKey(storeKey), value });
          }
        }
      }
      return resolve(result);
    });
  }

  async clear(): Promise<void> {
    const prefixWithSeparator = `${this.storeKeyPrefix}-`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const storeKey = window.localStorage.key(i);
      if (storeKey && storeKey.startsWith(prefixWithSeparator)) {
        keysToRemove.push(storeKey);
      }
    }
    keysToRemove.forEach(key => window.localStorage.removeItem(key));
  }

  private convertUserKeyToStoreKey(userKey: string): string {
    return `${this.storeKeyPrefix}-${userKey}`;
  }

  private convertStoreKeyToUserKey(storeKey: string): string {
    return storeKey.substring(this.storeKeyPrefix.length + 1);
  }

  snapshot(): KV<unknown>[] {
    throw new Error('Not supported');
  }

  observe<T = unknown>(): Observable<{ key: string; value: T | null }> {
    const prefixWithSeparator = `${this.storeKeyPrefix}-`;
    return fromEvent<StorageEvent>(window, 'storage').pipe(
      filter(e => (e.key || '').startsWith(prefixWithSeparator)),
      map(e => ({
        key: this.convertStoreKeyToUserKey(truthy(e.key)),
        value: e.newValue === null ? null : (JSON.parse(e.newValue) as T),
      })),
    );
  }
}
