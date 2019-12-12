import {Observable} from 'rxjs';
import {KV} from '@app/store/store-adapter';

/** Returns true if old value is different from new. */
export type NeedUpdateFn<T> = (oldValue?: T, newValue?: T) => boolean;
export type FetchFn<T> = () => Observable<T|undefined>;

export const DO_NOT_PREFETCH = undefined;

/** Lazy refresh (re-fetch) modes for get operation. */
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
  RefreshOncePerSession = 2,
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
   * @param needUpdateFn - compares existing & refreshed values and decides if the update should be ignored.
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
   * @param needUpdateFn - used to check if the old value equal to the new value. If values are equal -> set will result to no-op.
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

