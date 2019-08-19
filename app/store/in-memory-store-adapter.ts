/** Store that does nothing. */
import {KV, StoreAdapter} from '@app/store/store-adapter';

export class InMemoryStoreAdapter implements StoreAdapter {
  readonly map = new Map<string, any>();

  get<T>(key: string): Promise<T|undefined> {
    return Promise.resolve(this.map.get(key));
  }

  getAll<T>(keys: readonly string[]): Promise<(T|undefined)[]> {
    return new Promise<(T|undefined)[]>(resolve => {
      const result: (T|undefined)[] = [];
      for (const key of keys) {
        result.push(this.map.get(key));
      }
      return resolve(result);
    });
  }

  set<T>(key: string, value: T|undefined): Promise<void> {
    return new Promise<void>(resolve => {
      if (value === undefined) {
        this.map.delete(key);
      } else {
        this.map.set(key, value);
      }
      resolve();
    });
  }

  setAll(map: { [key: string]: any }): Promise<void> {
    return new Promise<void>(resolve => {
      for (const [key, value] of Object.entries(map)) {
        this.map.set(key, value);
      }
      resolve();
    });
  }

  list<T>(keyPrefix?: string): Promise<KV<T>[]> {
    return new Promise<KV<T>[]>(resolve => {
      const result: KV<T>[] = [];
      for (const key of this.map.keys()) {
        if (!keyPrefix || keyPrefix === '' || key.startsWith(keyPrefix)) {
          const value = this.map.get(key);
          result.push({key, value});
        }
      }
      resolve(result);
    });
  }

  clear(): Promise<void> {
    return new Promise<void>(resolve => {
      this.map.clear();
      resolve();
    });
  }

  async init(schemaVersion: number): Promise<void> {
    const myVersion: number|undefined = await this.get('version');
    if (myVersion != schemaVersion) {
      await this.clear();
      await this.set('version', schemaVersion);
    }
    return Promise.resolve();
  }

  snapshot(): KV<unknown>[] {
    const result: KV<unknown>[] = [];
    for (const key of this.map.keys()) {
      const value = this.map.get(key);
      result.push({key, value});
    }
    return result;
  }
}

