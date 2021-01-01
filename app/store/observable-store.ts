import {Observable} from 'rxjs';
import {KV} from './async-store';

/** Returns true if the new value is different from the old one and should be updated in the DB. */
export type CheckUpdateFn<T> = (oldValue?: T, newValue?: T) => boolean;

/** A function called when a store wants to fetch first time or re-fetch an existing value. */
export type FetchFn<T> = () => Observable<T|undefined>;

/** List of refresh modes for get() operations. */
export enum RefreshMode {
  /**
   * The key is not re-fetched if found in the local store.
   * If key is not found in the local store -> fetch is initiated.
   */
  DoNotRefresh = 1,

  /**
   * The key is fetched only if
   *  1. It was not successfully fetched during the app session before.
   *  2. There was no set during the app session for the key yet.
   */
  RefreshOnce = 2,

  /**
   * The key is fetched regardless of the local store content.
   */
  Refresh = 3
}

export interface ObservableStore {
  /**
   * Returns observable for the key.
   * @param key - key of the value. 'undefined' key will result to no-op.
   * @param fetchFn - optional fetch function. Called if refreshMode requires it.
   * @param refreshMode - defines how to refresh the value. fetchFn is used to get the refreshed value.
   * @param checkUpdateFn - compares existing & refreshed values and decides if the update should be ignored.
   */
  get<T>(key: string|undefined,
         fetchFn: FetchFn<T>|undefined,
         refreshMode: RefreshMode,
         checkUpdateFn: CheckUpdateFn<T>,
  ): Observable<T|undefined>;

  /**
   * Updates value in the DB.
   * @param key - key of the value. 'undefined' key will result to no-op.
   * @param value - the value to set. 'undefined' value will trigger entry removal from the DB.
   * @param checkUpdateFn - used to check if the old value equal to the new value. If values are equal -> set will result to no-op.
   */
  set<T>(key: string|undefined, value: T|undefined, checkUpdateFn: CheckUpdateFn<T>): Promise<void>;

  /**
   * Removes value with the given key from the DB.
   * If key is undefined does nothing.
   */
  remove(key: string|undefined): Promise<void>;

  /** Lists all values by key prefix. */
  snapshot<T>(keyPrefix: string): Promise<KV<T>[]>;

  /** Removes all data from the store. */
  clear(): Promise<void>;

  /** Resolves when the store is initialized and is ready to use. */
  readonly initialized$$: Promise<void>;
}

export function skipUpdateCheck(): boolean {
  throw new Error('This is a marker function that must never be called!');
}

