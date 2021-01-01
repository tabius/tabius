import {AsyncStore, KV} from './async-store';

/** AsyncStore that keeps data in memory. */
export class InMemoryAsyncStore implements AsyncStore {
  private readonly map = new Map<string, unknown>();

  get<T = unknown>(key: string): Promise<T|undefined> {
    return Promise.resolve(this.map.get(key) as T|undefined);
  }

  getAll<T = unknown>(keys: readonly string[]): Promise<(T|undefined)[]> {
    return new Promise<(T|undefined)[]>(resolve => {
      const result = keys.map(key => this.map.get(key) as T|undefined);
      return resolve(result);
    });
  }

  set<T = unknown>(key: string, value: T|undefined): Promise<void> {
    return new Promise<void>(resolve => {
      this._set(key, value);
      resolve();
    });
  }

  private _set(key: string, value: unknown|undefined): void {
    if (value === undefined) {
      this.map.delete(key);
    } else {
      this.map.set(key, value);
    }
  }

  setAll<T = unknown>(map: { [key: string]: T }): Promise<void> {
    return new Promise<void>(resolve => {
      for (const [key, value] of Object.entries(map)) {
        this._set(key, value);
      }
      resolve();
    });
  }

  list<T = unknown>(keyPrefix?: string): Promise<KV<T>[]> {
    return new Promise<KV<T>[]>(resolve => {
      const result: KV<T>[] = [];
      for (const [key, value] of this.map) {
        if (!keyPrefix || keyPrefix.length === 0 || key.startsWith(keyPrefix)) {
          result.push({key, value: value as T});
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

  snapshot(): KV<unknown>[] {
    const result: KV<unknown>[] = [];
    for (const [key, value] of this.map) {
      result.push({key, value});
    }
    return result;
  }
}

