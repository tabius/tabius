/** Key & value pair. */
export interface KV<T> {
  key: string;
  value: T;
}

export interface StoreAdapter {
  /** Returns value by key. */
  get<T>(key: string): Promise<T|undefined>;

  /** Returns all entries for key */
  getAll<T>(keys: readonly string[]): Promise<(T|undefined)[]>;

  /** Sets value by key */
  set<T>(key: string, value: T|undefined): Promise<void>;

  /** Sets all entries found in map */
  // todo: contract for undefined?
  setAll(map: { [key: string]: any }): Promise<void>;

  /** Returns all objects with a given key prefix. */
  list<T>(keyPrefix?: string): Promise<KV<T>[]>;

  /** Removes all data in the store. */
  clear(): Promise<void>;

  /** TODO: provide an upgrade function as a parameter. */
  init(schemaVersion: number): Promise<void>;
}
