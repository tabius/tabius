/** Store that does nothing. */
import {StoreAdapter} from '@app/store/store-adapter';

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

  list<T>(keyPrefix: string): Promise<T[]> {
    return new Promise<T[]>(resolve => {
      const result: T[] = [];
      for (const key of this.map.keys()) {
        if (key.startsWith(keyPrefix)) {
          result.push(this.map.get(key));
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
}

