/** Store that does nothing. */
import {StoreAdapter} from '@app/store/store-adapter';

export class InMemoryStoreAdapter implements StoreAdapter {
  readonly map = new Map<string, any>();

  get<T>(key: string): Promise<T|undefined> {
    return Promise.resolve(this.map.get(key));
  }

  getAll<T>(keys: string[]): Promise<(T|undefined)[]> {
    //todo:
    return Promise.resolve([]);
  }

  set<T>(key: string, value: T|undefined): Promise<void> {
    if (value === undefined) {
      this.map.delete(key);
    } else {
      this.map.set(key, value);
    }
    return Promise.resolve();
  }

  setAll(map: { [p: string]: any }): Promise<void> {
    throw new Error('Not implemented');
  }

  list<T>(keyPrefix: string): Promise<T[]> {
    const result: T[] = [];
    for (const key of this.map.keys()) {
      if (key.startsWith(keyPrefix)) {
        result.push(this.map.get(key));
      }
    }
    return Promise.resolve(result);
  }

  clear(): Promise<void> {
    this.map.clear();
    return Promise.resolve();
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

