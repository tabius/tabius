import { ObservableStoreImpl } from './observable-store-impl';
import { AsyncStore, KV } from './async-store';
import { ObservableStore, RefreshMode, skipUpdateCheck } from './observable-store';
import { delay, switchMap } from 'rxjs/operators';
import { firstValueFrom, of, ReplaySubject } from 'rxjs';
import { checkUpdateByStringify } from './update-functions';

/** No-Op impl used in tests. */
class NoOpAsyncStore implements AsyncStore {
  calls: string[] = [];

  clear(): Promise<void> {
    this.calls.push('clear');
    return Promise.resolve();
  }

  // eslint-disable-next-line
  get<T = unknown>(_key: string): Promise<T | undefined> {
    this.calls.push('get');
    return Promise.resolve(undefined);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAll<T = unknown>(_keys: ReadonlyArray<string>): Promise<(T | undefined)[]> {
    this.calls.push('getAll');
    return Promise.resolve([]);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  list<T = unknown>(_keyPrefix?: string): Promise<KV<T>[]> {
    this.calls.push('list');
    return Promise.resolve([]);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  set<T = unknown>(_key: string, _value: T | undefined): Promise<void> {
    this.calls.push('set');
    return Promise.resolve();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setAll<T = unknown>(_map: { [p: string]: T }): Promise<void> {
    this.calls.push('setAll');
    return Promise.resolve();
  }

  snapshot(): KV<unknown>[] {
    this.calls.push('snapshot');
    return [];
  }
}

/** Creates new ObservableStoreImpl with NoOpAsyncStore. */
function newObservableStoreForTest(asyncStore = new NoOpAsyncStore()): ObservableStore {
  return new ObservableStoreImpl(() => asyncStore);
}

describe('ObservableStore', () => {
  it('fetches and sets value to adapter if it was missed', async () => {
    let setKey = '';
    let setValue: any = undefined;

    class AsyncStoreForTest extends NoOpAsyncStore {
      set<T>(key: string, value: T | undefined): Promise<void> {
        setKey += key; // the way to check in this test that 'set' was called only once.
        setValue = value;
        return Promise.resolve();
      }
    }

    const store = new ObservableStoreImpl(() => new AsyncStoreForTest());

    const getKey = 'key';
    const fetchedValue = 'fetched';
    const returnValue = await firstValueFrom(
      store.get<string>(getKey, () => of(fetchedValue), RefreshMode.DoNotRefresh, skipUpdateCheck),
    );

    expect(returnValue).toBe(fetchedValue);
    expect(setKey).toBe(getKey);
    expect(setValue).toBe(fetchedValue);
  });

  it('should respect RefreshMode.RefreshOncePerSession', async () => {
    let nFetchesCalled = 0;
    const fetchFn = () => {
      nFetchesCalled++;
      return of('value');
    };
    const store = newObservableStoreForTest();
    const key = 'Key';
    const v1 = await firstValueFrom(store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, checkUpdateByStringify));
    const v2 = await firstValueFrom(store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, checkUpdateByStringify));
    expect(v1).toBe(v2);
    expect(nFetchesCalled).toBe(1);
  });

  it('should not call fetchFn twice for RefreshMode.RefreshOncePerSession in parallel', async () => {
    let nFetchesCalled = 0;
    const key = 'Key';
    const value = 'Value';
    const resolver$ = new ReplaySubject(1);
    const fetchFn = () => {
      nFetchesCalled++;
      return resolver$.pipe(switchMap(() => of(value)));
    };
    const store = newObservableStoreForTest();
    const v1$$ = firstValueFrom(store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, checkUpdateByStringify));
    const v2$$ = firstValueFrom(store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, checkUpdateByStringify));
    resolver$.next(true);
    const res = await Promise.all([v1$$, v2$$]);
    expect(nFetchesCalled).toBe(1);
    expect(res).toEqual([value, value]);
  });

  it('should not call fetchFn twice for RefreshMode.RefreshOncePerSession in parallel with delay', async () => {
    let nFetchesCalled = 0;
    const key = 'Key';
    const value = 'Value';
    const resolver$ = new ReplaySubject(1);
    const fetchFn = () => {
      nFetchesCalled++;
      return resolver$.pipe(
        delay(100),
        switchMap(() => of(value)),
      );
    };
    const store = newObservableStoreForTest();
    const v1$$ = firstValueFrom(store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, checkUpdateByStringify));
    const v2$$ = firstValueFrom(store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, checkUpdateByStringify));
    resolver$.next(true);
    const res = await Promise.all([v1$$, v2$$]);
    expect(nFetchesCalled).toBe(1);
    expect(res).toEqual([value, value]);
  });

  it('should not call fetchFn for RefreshMode.RefreshOncePerSession if there was set before', async () => {
    const key = 'Key';
    const value = 'Value';

    class TestStoreAdapter extends NoOpAsyncStore {
      get = <T>(k: string): Promise<T | undefined> =>
        Promise.resolve(k === key ? value : undefined) as unknown as Promise<T | undefined>;
    }

    let nFetchesCalled = 0;
    const fetchFn = () => {
      nFetchesCalled++;
      return of(value);
    };

    const store = new ObservableStoreImpl(() => new TestStoreAdapter());
    await store.set<string>(key, value, skipUpdateCheck);
    await firstValueFrom(store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, checkUpdateByStringify));
    expect(nFetchesCalled).toBe(0);
  });

  it('should not call fetchFn for RefreshMode.DoNotRefresh', async () => {
    let nFetchesCalled = 0;
    const key = 'Key';
    const value = 'Value';

    class TestStoreAdapter extends NoOpAsyncStore {
      get = <T>(k: string): Promise<T | undefined> =>
        Promise.resolve(k === key ? value : undefined) as unknown as Promise<T | undefined>;
    }

    const fetchFn = () => {
      nFetchesCalled++;
      return of('?');
    };
    const store = new ObservableStoreImpl(() => new TestStoreAdapter());
    await store.set<string>(key, value, skipUpdateCheck);
    const result = await firstValueFrom(store.get<string>(key, fetchFn, RefreshMode.DoNotRefresh, checkUpdateByStringify));
    expect(nFetchesCalled).toBe(0);
    expect(result).toBe(value);
  });

  it('should call fetchFn for RefreshMode.Refresh for all gets', async () => {
    let nFetchesCalled = 0;
    const key = 'Key';
    const value = 'Value';
    const fetchFn = () => {
      nFetchesCalled++;
      return of(value);
    };
    const store = newObservableStoreForTest();
    await firstValueFrom(store.get<string>(key, fetchFn, RefreshMode.Refresh, checkUpdateByStringify));
    await firstValueFrom(store.get<string>(key, fetchFn, RefreshMode.Refresh, checkUpdateByStringify));
    await firstValueFrom(store.get<string>(key, fetchFn, RefreshMode.Refresh, checkUpdateByStringify));
    await firstValueFrom(store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, checkUpdateByStringify));
    await firstValueFrom(store.get<string>(key, fetchFn, RefreshMode.DoNotRefresh, checkUpdateByStringify));
    expect(nFetchesCalled).toBe(3);
  });

  it('should return store value when RefreshMode.DoNotRefresh and no fetchFn provided', async () => {
    const store = newObservableStoreForTest();
    const result = await firstValueFrom(store.get<string>('some key', undefined, RefreshMode.DoNotRefresh, skipUpdateCheck));
    expect(result).toBeUndefined();
  });

  it('should not be blocked by gets with no subscription', async () => {
    const key = 'Key';
    const value = 'Value';
    const fetchFn = () => {
      return of(value);
    };
    const store = newObservableStoreForTest();
    store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, skipUpdateCheck);
    const res = await firstValueFrom(store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, skipUpdateCheck));
    expect(res).toBe(value);
  });

  it('should not fetch twice with RefreshMode.RefreshOncePerSession when init is delayed', async () => {
    const key = 'Key';
    const value = 'Value';
    let nFetchesCalled = 0;
    const fetchFn = () => {
      nFetchesCalled++;
      return of(value);
    };
    const store = newObservableStoreForTest();
    const res1 = await firstValueFrom(store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, skipUpdateCheck));
    const res2 = await firstValueFrom(store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, skipUpdateCheck));
    expect(res1).toBe(value);
    expect(res2).toBe(value);
    expect(nFetchesCalled).toBe(1);
  });

  // TODO: add tests for error handling!
});
