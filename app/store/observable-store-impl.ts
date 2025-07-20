import { firstValueFrom, from, Observable, of, ReplaySubject } from 'rxjs';
import { AsyncStore, KV } from './async-store';
import { catchError, shareReplay, switchMap, take, tap } from 'rxjs/operators';
import { CheckUpdateFn, FetchFn, ObservableStore, RefreshMode, skipUpdateCheck } from './observable-store';
import { fail, truthy } from 'assertic';

/** Low-level key->value storage. */
export class ObservableStoreImpl implements ObservableStore {
  private markAsInitialized!: () => void;
  readonly initialized$$ = new Promise<void>(resolve => (this.markAsInitialized = resolve));

  private readonly streamMap = new Map<string, ReplaySubject<any>>();

  /** Set of refreshed during current session ids. */
  private readonly refreshedKeySet = new Set<string>();

  private readonly asyncStore$$: Promise<AsyncStore>;

  /** Queue to make 'set' opts sequential (synchronized).*/
  readonly setOpsQueue = new Map<string, SetOp<any>[]>();

  readonly inFlightFetchOps = new Map<string, FetchOp<unknown>>();

  readonly inFlightInitRxOps = new Map<string, InitOp>();

  constructor(
    asyncStoreFactory: () => AsyncStore,
    transferStateAdapter: TransferStateAdapter = new NoOpTransferStateAdapter(),
    private readonly freezeFn = noFreeze,
  ) {
    this.asyncStore$$ = new Promise<AsyncStore>(resolve => {
      const asyncStore = asyncStoreFactory();
      transferStateAdapter.setSnapshotProvider(() => pairsToObject(asyncStore.snapshot()));
      const asyncStoreInit$$: Promise<void> = this.setInitialAsyncStoreState(asyncStore, transferStateAdapter);
      asyncStoreInit$$.then(() => {
        resolve(asyncStore);
        this.markAsInitialized();
      });
    });
  }

  private async setInitialAsyncStoreState(asyncStore: AsyncStore, transferStateAdapter: TransferStateAdapter): Promise<void> {
    const updatedEntries = await transferStateAdapter.initialize(asyncStore);
    // Instantiate reactive streams as initialized and refreshed.
    for (const [key, value] of Object.entries(updatedEntries || {})) {
      this.registerNewRxStreamForKey(key, value);
      this.markKeyAsFresh(key);
    }
  }

  get<T>(
    key: string | undefined,
    fetchFn: FetchFn<T> | undefined,
    refreshMode: RefreshMode,
    checkUpdateFn: CheckUpdateFn<T>,
  ): Observable<T | undefined> {
    if (!key) {
      return of(undefined);
    }
    let rs$ = this.streamMap.get(key) as ReplaySubject<T | undefined>;
    if (rs$) {
      return this.refreshRxStreamIfNeeded(rs$, key, fetchFn, refreshMode, checkUpdateFn);
    }
    // Create a new replay subject for the key and run initialization code for it.
    rs$ = this.registerNewRxStreamForKey<T>(key);
    return from(this.initializeRxStream(rs$, key, fetchFn, refreshMode, checkUpdateFn)).pipe(switchMap(() => rs$));
  }

  private async initializeRxStream<T>(
    rs$: ReplaySubject<T | undefined>,
    key: string,
    fetchFn: FetchFn<T> | undefined,
    refreshMode: RefreshMode,
    checkUpdateFn: CheckUpdateFn<T>,
  ): Promise<void> {
    // First get op. First, create a blocking promise for concurrent first gets.
    let resolveFirstGetOpFn: () => void = () => fail('A stub for firstGetResolveFn should never be called');
    const firstGetOp: InitOp = {
      promise: new Promise<void>(resolve => (resolveFirstGetOpFn = resolve)),
    };
    try {
      this.inFlightInitRxOps.set(key, firstGetOp);

      const store = await this.asyncStore$$;
      const valueFromStore = await store.get<T>(key);
      if (valueFromStore) {
        // Emit the value from the store and check if refresh is needed.
        rs$.next(this.freezeFn(valueFromStore));
        this.runAsyncRefresh(key, fetchFn, refreshMode, checkUpdateFn);
      } else {
        // There is no value in the store -> fetch initial value.
        const fetchResult = fetchFn ? await this.doFetch(fetchFn, key) : { value: undefined, isFailed: false };
        await this._set(key, fetchResult.value, checkUpdateFn, !fetchResult.isFailed);
      }
    } catch (error) {
      console.error(`Failed to initialize key: ${key}`, error);
    } finally {
      resolveFirstGetOpFn();
      this.inFlightInitRxOps.delete(key);
    }
  }

  private refreshRxStreamIfNeeded<T>(
    rs$: Observable<T | undefined>,
    key: string,
    fetchFn: FetchFn<T> | undefined,
    refreshMode: RefreshMode,
    checkUpdateFn: CheckUpdateFn<T>,
  ): Observable<T | undefined> {
    const initOp = this.inFlightInitRxOps.get(key);
    const initOp$: Observable<unknown> = initOp ? from(initOp.promise) : of(undefined);

    // Wait until the first get is completed and call refresh next.
    return initOp$.pipe(
      tap(() => this.runAsyncRefresh(key, fetchFn, refreshMode, checkUpdateFn)),
      take(1),
      switchMap(() => rs$),
    );
  }

  // The refresh action is performed async (non-blocking).
  private runAsyncRefresh<T>(
    key: string,
    fetchFn: FetchFn<T> | undefined,
    refreshMode: RefreshMode,
    checkUpdateFn: CheckUpdateFn<T>,
  ): void {
    this._refresh(key, fetchFn, refreshMode, checkUpdateFn).catch(e => {
      console.error(`Failed to refresh key: ${key}`, e);
    });
  }

  private async _refresh<T>(
    key: string,
    fetchFn: FetchFn<T> | undefined,
    refreshMode: RefreshMode,
    checkUpdateFn: CheckUpdateFn<T>,
  ): Promise<void> {
    if (!fetchFn || refreshMode === RefreshMode.DoNotRefresh) {
      return;
    }

    if (refreshMode === RefreshMode.RefreshOnce && this.refreshedKeySet.has(key)) {
      return;
    }

    const fetchResult = await this.doFetch(fetchFn, key);
    if (!fetchResult.isFailed) {
      this.markKeyAsFresh(key);
      await this.set(key, fetchResult.value, checkUpdateFn);
    }
  }

  private async doFetch<T>(fetchFn: FetchFn<T>, key: string): Promise<{ value: T | undefined; isFailed: boolean }> {
    try {
      let fetchOp = this.inFlightFetchOps.get(key) as FetchOp<T>;
      if (!fetchOp || fetchOp.isFailed) {
        fetchOp = {
          fetch$: fetchFn().pipe(
            catchError(() => {
              fetchOp.isFailed = true;
              return of(undefined); // Fallback to undefined in case of failure.
            }),
            shareReplay(1),
          ),
        };
        this.inFlightFetchOps.set(key, fetchOp);
      }
      const result = await firstValueFrom(fetchOp.fetch$);
      return { value: result, isFailed: !!fetchOp.isFailed };
    } finally {
      this.inFlightFetchOps.delete(key);
    }
  }

  private registerNewRxStreamForKey<T>(key: string, initValue?: T): ReplaySubject<T | undefined> {
    const rs$ = new ReplaySubject<T | undefined>(1);
    this.streamMap.set(key, rs$);
    if (initValue !== undefined) {
      rs$.next(this.freezeFn(initValue));
    }
    return rs$;
  }

  async set<T>(key: string | undefined, value: T | undefined, checkUpdateFn: CheckUpdateFn<T>): Promise<void> {
    await this._set(key, value, checkUpdateFn, true);
  }

  async _set<T>(key: string | undefined, value: T | undefined, checkUpdateFn: CheckUpdateFn<T>, isFreshValue: boolean): Promise<void> {
    if (!key) {
      return;
    }
    {
      const queue = this.setOpsQueue.get(key);
      if (queue) {
        const prevSetOp = queue[queue.length - 1];
        try {
          await prevSetOp.promise; // Wait for a previous set to complete first.
          if (isSameSetOp(value, checkUpdateFn, prevSetOp.value, prevSetOp.checkUpdateFn)) {
            return;
          }
        } catch {
          // ignore prev-op result.
        }
      }
    }
    try {
      const setImplPromise$$ = this.setImpl(key, value, checkUpdateFn, isFreshValue);
      const queue = this.setOpsQueue.get(key) || [];
      queue.push({ promise: setImplPromise$$, value, checkUpdateFn });
      if (queue.length === 1) {
        this.setOpsQueue.set(key, queue);
      }
      await setImplPromise$$;
    } finally {
      const queue = truthy(this.setOpsQueue.get(key));
      if (queue.length === 1) {
        this.setOpsQueue.delete(key);
      } else {
        const [, ...tail] = queue;
        this.setOpsQueue.set(key, tail);
      }
    }
  }

  private async setImpl<T>(key: string, value: T | undefined, checkUpdateFn: CheckUpdateFn<T>, isFreshValue: boolean): Promise<void> {
    const inRefreshSet = this.refreshedKeySet.has(key);
    const store = await this.asyncStore$$;
    if (checkUpdateFn !== skipUpdateCheck) {
      const oldValue = await store.get<T>(key);
      if (!checkUpdateFn(oldValue, value)) {
        const isFirstUpdate = !inRefreshSet;
        const forceUpdate = isFirstUpdate && value === undefined && oldValue === undefined;
        if (!forceUpdate) {
          return;
        }
      }
    }
    if (!inRefreshSet && isFreshValue) {
      this.markKeyAsFresh(key)
    }
    await store.set(key, value);
    const rs$ = this.streamMap.get(key);
    if (rs$) {
      rs$.next(this.freezeFn(value));
    }
  }

  async remove(key: string | undefined): Promise<void> {
    return this.set(key, undefined, skipUpdateCheck);
  }

  async snapshot<T>(keyPrefix: string): Promise<KV<T>[]> {
    const store = await this.asyncStore$$;
    return store.list(keyPrefix);
  }

  async clear(): Promise<void> {
    const store = await this.asyncStore$$;
    this.streamMap.forEach(rs$ => rs$.next(undefined));
    return store.clear();
  }

  private markKeyAsFresh(key: string): void {
    this.refreshedKeySet.add(key);
  }
}

function pairsToObject(pairs: KV<unknown>[]): { [key: string]: any } {
  const res: any = {};
  for (const { key, value } of pairs) {
    res[key] = value;
  }
  return res;
}

function noFreeze<T>(obj: T | undefined): T | undefined {
  return obj;
}

// noinspection JSUnusedLocalSymbols,JSUnusedGlobalSymbols
export function deepFreeze<T>(obj: T | undefined): T | undefined {
  if (obj === undefined || obj === null) {
    return undefined;
  }
  Object.freeze(obj);
  for (const prop of Object.getOwnPropertyNames(obj)) {
    const value = obj[prop];
    if ((typeof value === 'object' || typeof value === 'function') && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj;
}

interface SetOp<T> {
  promise: Promise<void>;
  value: T | undefined;
  checkUpdateFn: CheckUpdateFn<T>;
}

interface FetchOp<T> {
  fetch$: Observable<T | undefined>;
  isFailed?: boolean;
}

interface InitOp {
  promise: Promise<void>;
}

function isSameSetOp(value1: any, checkUpdateFn1: CheckUpdateFn<any>, value2: any, checkUpdateFn2: CheckUpdateFn<any>): boolean {
  if ((checkUpdateFn1 === skipUpdateCheck && checkUpdateFn2 === skipUpdateCheck) || checkUpdateFn1 !== checkUpdateFn2) {
    return false;
  }
  if (value1 === value2) {
    return true;
  }
  return !checkUpdateFn1(value1, value2);
}

export interface TransferStateAdapter {
  /**
   * Initializes (upgrades) the store and returns a list of updated values.
   * The list of updated values is used to initialize reactive streams and avoid extra calls of the fetch function.
   */
  initialize: (asyncStore: AsyncStore) => Promise<{ [key: string]: unknown } | undefined>;

  setSnapshotProvider(snapshotProvider: () => object): void;
}

/** TransferStateAdapter that does nothing. */
class NoOpTransferStateAdapter implements TransferStateAdapter {
  initialize(): Promise<{ [key: string]: unknown } | undefined> {
    return Promise.resolve(undefined);
  }

  setSnapshotProvider(): void {}
}
