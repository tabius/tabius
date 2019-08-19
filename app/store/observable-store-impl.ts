import {combineLatest, Observable, of, ReplaySubject} from 'rxjs';
import {KV, StoreAdapter} from '@app/store/store-adapter';
import {makeStateKey, TransferState} from '@angular/platform-browser';
import {fromPromise} from 'rxjs/internal-compatibility';
import {catchError, map, take} from 'rxjs/operators';
import {FetchFn, NeedUpdateFn, ObservableStore, RefreshMode, skipUpdateCheck} from '@app/store/observable-store';

const SERVER_STATE_TIMESTAMP_KEY = 'server-state-timestamp';

/** Low level key->value storage. */
export class ObservableStoreImpl implements ObservableStore {
  private markAsInitialized!: () => void;
  readonly initialized$$ = new Promise<void>(resolve => this.markAsInitialized = resolve);

  private readonly dataMap = new Map<string, ReplaySubject<any>>();
  /** Set of refreshed during current session ids. */
  private readonly refreshSet = new Set<string>();
  private readonly storeAdapter$$: Promise<StoreAdapter>;

  /** Queue to make 'set' opts sequential (synchronized).*/
  private readonly setOpsQueue = new Map<string, SetOp<any>[]>();

  constructor(storeName: string,
              browser: boolean,
              adapterFactory: (name: string, browser: boolean) => StoreAdapter,
              serverState?: TransferState,
              schemaVersion?: number,
              private readonly freezeFn = noFreeze) {
    this.storeAdapter$$ = new Promise<StoreAdapter>(resolve => {
      const adapter = adapterFactory(storeName, browser);
      const t0 = Date.now();
      adapter.init(schemaVersion || 0).then(() => {
        if (!serverState) {
          resolve(adapter);
          this.markAsInitialized();
          return;
        }
        const serverStateKey = makeStateKey(`db-${storeName}`);
        if (browser) {
          const serverStateValue = serverState.get(serverStateKey, {});
          this.updateDbStateFromServerState(adapter, serverStateValue).then(() => {
            console.debug(`[${storeName}] store init time: ${Date.now() - t0}ms`);
            resolve(adapter);
            this.markAsInitialized();
          });
        } else {
          serverState.onSerialize(serverStateKey, () => {
            const kvPairs = adapter.snapshot();
            kvPairs.push({key: SERVER_STATE_TIMESTAMP_KEY, value: new Date().toUTCString()});
            return pairsToObject(kvPairs);
          });
          resolve(adapter);
          this.markAsInitialized();
        }
      });
    });
  }

  get<T>(key: string|undefined,
         fetchFn: FetchFn<T>|undefined,
         refreshMode: RefreshMode,
         needUpdateFn: NeedUpdateFn<T>,
  ): Observable<T|undefined> {
    if (!key) {
      return of(undefined);
    }
    let rs$ = this.dataMap.get(key);
    if (rs$) {
      this.refresh(key, fetchFn, refreshMode, needUpdateFn);
      return rs$;
    }
    rs$ = this.newReplaySubject(key);
    const firstGetOp$$ = this.handleFirstGet(key, rs$, fetchFn, refreshMode, needUpdateFn);
    const firstGetOp$: Observable<void> = fromPromise(firstGetOp$$);
    return combineLatest([firstGetOp$, rs$]).pipe(map(([, rs]) => rs));
  }

  /** Note: This method is called only on the first access to the value during the app session. */
  private async handleFirstGet<T>(key: string,
                                  rs$: ReplaySubject<T|undefined>,
                                  fetchFn: FetchFn<T>|undefined,
                                  refreshMode: RefreshMode,
                                  needUpdateFn: NeedUpdateFn<T>): Promise<void> {
    const store = await this.storeAdapter$$;
    let value = await store.get<T>(key);
    if (value) {
      rs$.next(this.freezeFn(value));
      this.refresh(key, fetchFn, refreshMode, needUpdateFn);
      return;
    }
    if (fetchFn) {
      value = await fetchAndFallbackToUndefined(fetchFn);
    }
    await this.set(key, value, needUpdateFn);
  }

  // refresh action is performed async (non-blocking).
  private refresh<T>(key: string, fetchFn: FetchFn<T>|undefined, refreshMode: RefreshMode, needUpdateFn: NeedUpdateFn<T>): void {
    if (!fetchFn || refreshMode === RefreshMode.DoNotRefresh || (refreshMode === RefreshMode.RefreshOncePerSession && this.refreshSet.has(key))) {
      return;
    }
    fetchAndFallbackToUndefined(fetchFn).then(value => {
      if (value !== undefined) {
        this.set(key, value, needUpdateFn).catch(err => console.error(err));
      }
    }); // fetch and refresh it asynchronously.
  }

  private newReplaySubject<T>(key: string, initValue?: T): ReplaySubject<T|undefined> {
    const rs$ = new ReplaySubject<T|undefined>(1);
    this.dataMap.set(key, rs$);
    if (initValue !== undefined) {
      rs$.next(this.freezeFn(initValue));
    }
    return rs$;
  }

  async set<T>(key: string|undefined, value: T|undefined, needUpdateFn: NeedUpdateFn<T>): Promise<void> {
    if (!key) {
      return;
    }
    {
      const queue = this.setOpsQueue.get(key);
      if (queue) {
        const prevSetOp = queue[queue.length - 1];
        try {
          await prevSetOp.promise; // wait previous set to complete first.
          if (isSameSetOp(value, needUpdateFn, prevSetOp.value, prevSetOp.needUpdateFn)) {
            return;
          }
        } catch (e) {
          // ignore prev-op result.
        }
      }
    }
    try {
      const promise = this.setImpl(key, value, needUpdateFn);
      const queue = this.setOpsQueue.get(key) || [];
      queue.push({promise, value, needUpdateFn});
      if (queue.length === 1) {
        this.setOpsQueue.set(key, queue);
      }
      await promise;
    } finally {
      const queue = this.setOpsQueue.get(key)!;
      if (queue.length === 1) {
        this.setOpsQueue.delete(key);
      } else {
        const [, ...tail] = queue;
        this.setOpsQueue.set(key, tail);
      }
    }
  }

  private async setImpl<T>(key: string, value: T|undefined, needUpdateFn: NeedUpdateFn<T>): Promise<void> {
    const inRefreshSet = this.refreshSet.has(key);
    const store = await this.storeAdapter$$;
    if (needUpdateFn !== skipUpdateCheck) {
      let oldValue = await store.get<T>(key);
      if (!needUpdateFn(oldValue, value)) {
        const firstUpdate = !inRefreshSet;
        const forceUpdate = firstUpdate && value === undefined && oldValue === undefined;
        if (!forceUpdate) {
          return;
        }
      }
    }
    if (!inRefreshSet) {
      this.refreshSet.add(key);
    }
    await store.set(key, value);
    const rs$ = this.dataMap.get(key);
    if (rs$) {
      rs$.next(this.freezeFn(value));
    }
  }

  async remove<T>(key: string|undefined): Promise<void> {
    this.set(key, undefined, skipUpdateCheck);
  }

  async list<T>(keyPrefix: string): Promise<KV<T>[]> {
    const store = await this.storeAdapter$$;
    return store.list(keyPrefix);
  }

  async clear(): Promise<void> {
    const store = await this.storeAdapter$$;
    this.dataMap.forEach(subj$ => subj$.next(undefined));
    return store.clear();
  }

  /**
   * When PWA is initialized it receives server state as an input. This server state may already be outdated (new data is fetched by AJAX).
   * This method checks if the state is new (never seen before) and runs DB data update only if server state was never seen before.
   */
  private async updateDbStateFromServerState(adapter: StoreAdapter, serverState: any): Promise<void> {
    const serverStateTimestamp = serverState[SERVER_STATE_TIMESTAMP_KEY];
    const dbVersionOfServerState = await adapter.get(SERVER_STATE_TIMESTAMP_KEY);
    if (serverStateTimestamp === dbVersionOfServerState) {
      return;
    }
    await adapter.setAll(serverState);
    for (const [key, value] of Object.entries(serverState)) { // instantiate subjects -> they will be needed on browser re-render.
      this.newReplaySubject(key, value);
      this.refreshSet.add(key);
    }
  }
}

function pairsToObject(pairs: KV<unknown>[]): { [key: string]: any } {
  const res: any = {};
  for (const {key, value} of pairs) {
    res[key] = value;
  }
  return res;
}

/** Store for user's personal settings and playlists. */
function noFreeze<T>(obj: T|undefined): T|undefined {
  return obj;
}

// noinspection JSUnusedLocalSymbols,JSUnusedGlobalSymbols
function deepFreeze<T>(obj: T|undefined): T|undefined {
  if (obj === undefined) {
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

function fetchAndFallbackToUndefined<T>(fetchFn: (() => Observable<T|undefined>)): Promise<T|undefined> {
  return fetchFn().pipe(
      take(1),
      catchError(() => of(undefined)),
  ).toPromise();
}

interface SetOp<T> {
  promise: Promise<void>,
  value: T|undefined;
  needUpdateFn: NeedUpdateFn<T>;
}

function isSameSetOp(value1: any, needUpdateFn1: NeedUpdateFn<any>, value2: any, needUpdateFn2: NeedUpdateFn<any>): boolean {
  if ((needUpdateFn1 === skipUpdateCheck && needUpdateFn2 === skipUpdateCheck) || needUpdateFn1 !== needUpdateFn2) {
    return false;
  }
  if (value1 === value2) {
    return true;
  }
  return !needUpdateFn1(value1, value2);
}

