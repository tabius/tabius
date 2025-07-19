import { firstValueFrom, Observable, of, ReplaySubject } from 'rxjs';
import { AsyncStore, KV } from './async-store';
import { catchError, take } from 'rxjs/operators';
import { CheckUpdateFn, FetchFn, ObservableStore, RefreshMode, skipUpdateCheck } from './observable-store';
import { truthy } from 'assertic';

export class ObservableStoreImpl implements ObservableStore {
  private markAsInitialized!: () => void;
  readonly initialized$$ = new Promise<void>(resolve => (this.markAsInitialized = resolve));

  private readonly dataMap = new Map<string, ReplaySubject<any>>();
  private readonly refreshSet = new Set<string>();
  private readonly asyncStore$$: Promise<AsyncStore>;
  private readonly setOpsQueue = new Map<string, Promise<unknown>>();

  private readonly inFlightLoads = new Map<string, Promise<void>>();
  private readonly inFlightRefreshes = new Map<string, Promise<void>>();
  private readonly inFlightFetches = new Map<string, Promise<unknown>>();

  constructor(
    asyncStoreFactory: () => AsyncStore,
    transferStateAdapter: TransferStateAdapter = new NoOpTransferStateAdapter(),
    private readonly freezeFn: <T>(obj: T) => T = obj => obj,
  ) {
    this.asyncStore$$ = (async () => {
      const asyncStore = asyncStoreFactory();
      transferStateAdapter.setSnapshotProvider(() => pairsToObject(asyncStore.snapshot()));
      const updatedEntries = await transferStateAdapter.initialize(asyncStore);
      for (const [key, value] of Object.entries(updatedEntries || {})) {
        this.registerNewRxStreamForKey(key, value);
        this.refreshSet.add(key);
      }
      this.markAsInitialized();
      return asyncStore;
    })();
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

    const existingStream$ = this.dataMap.get(key) as ReplaySubject<T | undefined> | undefined;

    if (existingStream$) {
      // --- Path for an existing stream ---
      const refreshPromise = this.refreshKeyIfNeeded(key, fetchFn, refreshMode, checkUpdateFn);
      if (refreshMode === RefreshMode.Refresh) {
        return new Observable(subscriber => {
          refreshPromise.then(() => existingStream$.subscribe(subscriber)).catch(e => subscriber.error(e));
        });
      } else {
        return existingStream$;
      }
    }
    // --- Path for a new stream ---
    const newStream$ = this.registerNewRxStreamForKey(key);
    this.loadKey(key, fetchFn);
    return newStream$ as Observable<T | undefined>;
  }

  private loadKey<T>(key: string, fetchFn: FetchFn<T> | undefined): void {
    if (this.inFlightLoads.has(key)) return;

    const loadPromise = (async () => {
      const store = await this.asyncStore$$;
      const valueFromStore = await store.get<T>(key);
      if (valueFromStore !== undefined) {
        await this.set(key, valueFromStore, skipUpdateCheck);
      } else if (fetchFn) {
        const valueFromFetch = await this.doFetch(key, fetchFn);
        await this.set(key, valueFromFetch, skipUpdateCheck);
      } else {
        await this.set(key, undefined, skipUpdateCheck);
      }
    })().finally(() => {
      this.inFlightLoads.delete(key);
    });
    this.inFlightLoads.set(key, loadPromise);
  }

  private async refreshKeyIfNeeded<T>(
    key: string,
    fetchFn: FetchFn<T> | undefined,
    refreshMode: RefreshMode,
    checkUpdateFn: CheckUpdateFn<T>,
  ): Promise<void> {
    // If we're still loading the very first value, wait for it.
    const loadPromise = this.inFlightLoads.get(key);
    if (loadPromise) {
      await loadPromise;
    }

    // Now do all “should I refresh?” checks:
    if (!fetchFn || refreshMode === RefreshMode.DoNotRefresh || this.inFlightRefreshes.has(key)) {
      return;
    }
    if (refreshMode === RefreshMode.RefreshOnce && this.refreshSet.has(key)) {
      return;
    }

    // Schedule the refresh.
    const refreshPromise = (async () => {
      const fetchedValue = await this.doFetch(key, fetchFn);
      const stream$ = truthy(this.dataMap.get(key));
      const currentValue = await firstValueFrom(stream$.pipe(take(1)));
      if (checkUpdateFn === skipUpdateCheck || checkUpdateFn(currentValue, fetchedValue)) {
        await this.set(key, fetchedValue, skipUpdateCheck);
      }
    })().finally(() => {
      this.inFlightRefreshes.delete(key);
    });

    this.inFlightRefreshes.set(key, refreshPromise);
    return refreshPromise;
  }

  private doFetch<T>(key: string, fetchFn: FetchFn<T>): Promise<T | undefined> {
    const inFlight = this.inFlightFetches.get(key);
    if (inFlight) return inFlight as Promise<T | undefined>;

    const fetchPromise = firstValueFrom(fetchFn().pipe(catchError(() => of(undefined))))
      .then(result => {
        if (result !== undefined) this.refreshSet.add(key);
        return result;
      })
      .finally(() => {
        this.inFlightFetches.delete(key);
      });
    this.inFlightFetches.set(key, fetchPromise);
    return fetchPromise;
  }

  private registerNewRxStreamForKey<T>(key: string, initValue?: T): ReplaySubject<T | undefined> {
    const rs$ = new ReplaySubject<T | undefined>(1);
    this.dataMap.set(key, rs$);
    if (initValue !== undefined) {
      rs$.next(this.freezeFn(initValue));
    }
    return rs$;
  }

  async set<T>(key: string | undefined, value: T | undefined, checkUpdateFn: CheckUpdateFn<T>): Promise<void> {
    if (!key) {
      return;
    }

    const priorOp$$ = this.setOpsQueue.get(key) ?? Promise.resolve();
    const newOp$$ = (async () => {
      await priorOp$$;
      if (!this.dataMap.has(key)) {
        this.registerNewRxStreamForKey(key);
      }
      const store = await this.asyncStore$$;
      if (checkUpdateFn !== skipUpdateCheck) {
        const oldValue = await store.get<T>(key);
        if (oldValue !== undefined && !checkUpdateFn(oldValue, value)) {
          return;
        }
      }

      // Only add to refreshSet for defined values.
      // A 'set' with an 'undefined' value is a removal and should clear the refreshed status of the key.
      if (value !== undefined) {
        this.refreshSet.add(key);
      } else {
        this.refreshSet.delete(key);
      }

      await store.set(key, value);

      const rs$ = this.dataMap.get(key);
      if (rs$) {
        rs$.next(this.freezeFn(value));
      }
    })();

    this.setOpsQueue.set(key, newOp$$);
    return newOp$$;
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
    await store.clear();
    this.dataMap.forEach(subj$ => subj$.next(undefined));
    this.dataMap.clear();
    this.refreshSet.clear();
    this.setOpsQueue.clear();
    this.inFlightFetches.clear();
    this.inFlightLoads.clear();
    this.inFlightRefreshes.clear();
  }
}

function pairsToObject(pairs: KV<unknown>[]): { [key: string]: any } {
  const res: { [key: string]: any } = {};
  for (const { key, value } of pairs) res[key] = value;
  return res;
}

export interface TransferStateAdapter {
  initialize: (asyncStore: AsyncStore) => Promise<{ [key: string]: unknown } | undefined>;

  setSnapshotProvider(snapshotProvider: () => object): void;
}

class NoOpTransferStateAdapter implements TransferStateAdapter {
  initialize = () => Promise.resolve(undefined);

  setSnapshotProvider() {}
}
