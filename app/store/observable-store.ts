import {Observable} from 'rxjs';
import {KV} from '@app/store/store-adapter';

/** Returns true if old value is different from new. */
export type NeedUpdateFn<T> = (oldValue?: T, newValue?: T) => boolean;
export type FetchFn<T> = () => Observable<T|undefined>;

export const DO_NOT_PREFETCH = undefined;

/** Lazy refresh (re-fetch) modes for get operation. */
export enum RefreshMode {
  /** The key is never re-fetched. */
  DoNotRefresh = 1,
  /** The key is fetched if it not was fetched during the session before. */
  RefreshOncePerSession = 2,
  /** The key is fetched. */
  Refresh = 3
}

export interface ObservableStore {
  /**
   * Returns observable for the key.
   * @param key - key of the value. 'undefined' key will result to no-op.
   * @param fetchFn - optional fetch function. If value was never seen before fetch() will be called.
   * @param refreshMode - defines how to refresh value. fetchFn is used to get the refreshed value.
   * @param needUpdateFn - compares existing & refreshed values and return false if the update should be ignored.
   */
  get<T>(key: string|undefined,
         fetchFn: FetchFn<T>|undefined,
         refreshMode: RefreshMode,
         needUpdateFn: NeedUpdateFn<T>,
  ): Observable<T|undefined>;

  /**
   * Updates value in the DB.
   * @param key - key of the value. 'undefined' key will result to no-op.
   * @param value - the value to set. 'undefined' value will trigger entry removal from the DB.
   * @param needUpdateFn -  used to check if the old value equal to the new value. If values are equal -> set will result to no-op.
   */
  set<T>(key: string|undefined, value: T|undefined, needUpdateFn: NeedUpdateFn<T>): Promise<void>;

  remove<T>(key: string|undefined): Promise<void>;

  /** Lists all values by key prefix. */
  list<T>(keyPrefix: string): Promise<KV<T>[]>;

  clear(): Promise<void>;

  initialized$$: Promise<void>;
}

export function skipUpdateCheck(): boolean {
  throw new Error('This is a marker function that must never be called!');
}

