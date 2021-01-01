import {ObservableStoreImpl} from './observable-store-impl';
import {AsyncStore, KV} from './async-store';
import {ObservableStore, RefreshMode, skipUpdateCheck} from './observable-store';
import {delay, switchMap, take} from 'rxjs/operators';
import {of, ReplaySubject} from 'rxjs';
import {checkUpdateByStringify} from './update-functions';

/** No-Op impl used in tests. */
class NoOpAsyncStore implements AsyncStore {
  calls: string[] = [];

  clear(): Promise<void> {
    this.calls.push('clear');
    return Promise.resolve();
  }

  // @ts-ignore
  get<T = unknown>(key: string): Promise<T|undefined> {
    this.calls.push('get');
    return Promise.resolve(undefined);
  }

  // @ts-ignore
  getAll<T = unknown>(keys: ReadonlyArray<string>): Promise<(T|undefined)[]> {
    this.calls.push('getAll');
    return Promise.resolve([]);
  }

  // @ts-ignore
  list<T = unknown>(keyPrefix?: string): Promise<KV<T>[]> {
    this.calls.push('list');
    return Promise.resolve([]);
  }

  // @ts-ignore
  set<T = unknown>(key: string, value: T|undefined): Promise<void> {
    this.calls.push('set');
    return Promise.resolve();
  }

  // @ts-ignore
  setAll<T = unknown>(map: { [p: string]: T }): Promise<void> {
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

  it('fetches and sets value to adapter if it was missed', async (done) => {
    let setKey = '';
    let setValue: any = undefined;

    class AsyncStoreForTest extends NoOpAsyncStore {
      set<T>(key: string, value: T|undefined): Promise<void> {
        setKey += key; // the way to check in this test that 'set' was called only once.
        setValue = value;
        return Promise.resolve();
      }
    }

    const store = new ObservableStoreImpl(() => new AsyncStoreForTest());

    const getKey = 'key';
    const fetchedValue = 'fetched';
    const returnValue = await store.get<string>(getKey, () => of(fetchedValue), RefreshMode.DoNotRefresh, skipUpdateCheck).pipe(take(1)).toPromise();

    expect(returnValue).toBe(fetchedValue);
    expect(setKey).toBe(getKey);
    expect(setValue).toBe(fetchedValue);

    done();
  });

  it('should respect RefreshMode.RefreshOncePerSession', async (done) => {
    let nFetchesCalled = 0;
    const fetchFn = () => {
      nFetchesCalled++;
      return of('value');
    };
    const store = newObservableStoreForTest();
    const key = 'Key';
    const v1 = await store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, checkUpdateByStringify).pipe(take(1)).toPromise();
    const v2 = await store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, checkUpdateByStringify).pipe(take(1)).toPromise();
    expect(v1).toBe(v2);
    expect(nFetchesCalled).toBe(1);
    done();
  });

  it('should not call fetchFn twice for RefreshMode.RefreshOncePerSession in parallel', async (done) => {
    let nFetchesCalled = 0;
    const key = 'Key';
    const value = 'Value';
    const resolver$ = new ReplaySubject(1);
    const fetchFn = () => {
      nFetchesCalled++;
      return resolver$.pipe(switchMap(() => of(value)));
    };
    const store = newObservableStoreForTest();
    const v1$$ = store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, checkUpdateByStringify).pipe(take(1)).toPromise();
    const v2$$ = store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, checkUpdateByStringify).pipe(take(1)).toPromise();
    resolver$.next();
    const res = await Promise.all([v1$$, v2$$]);
    expect(nFetchesCalled).toBe(1);
    expect(res).toEqual([value, value]);
    done();
  });

  it('should not call fetchFn twice for RefreshMode.RefreshOncePerSession in parallel with delay', async (done) => {
    let nFetchesCalled = 0;
    const key = 'Key';
    const value = 'Value';
    const resolver$ = new ReplaySubject(1);
    const fetchFn = () => {
      nFetchesCalled++;
      return resolver$.pipe(delay(100), switchMap(() => of(value)));
    };
    const store = newObservableStoreForTest();
    const v1$$ = store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, checkUpdateByStringify).pipe(take(1)).toPromise();
    const v2$$ = store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, checkUpdateByStringify).pipe(take(1)).toPromise();
    resolver$.next();
    const res = await Promise.all([v1$$, v2$$]);
    expect(nFetchesCalled).toBe(1);
    expect(res).toEqual([value, value]);
    done();
  });

  it('should not call fetchFn for RefreshMode.RefreshOncePerSession if there was set before', async (done) => {
    const key = 'Key';
    const value = 'Value';

    class TestStoreAdapter extends NoOpAsyncStore {
      get = <T>(k: string): Promise<T|undefined> => (Promise.resolve(k === key ? value : undefined) as unknown as Promise<T|undefined>);
    }

    let nFetchesCalled = 0;
    const fetchFn = () => {
      nFetchesCalled++;
      return of(value);
    };

    const store = new ObservableStoreImpl(() => new TestStoreAdapter());
    await store.set<string>(key, value, skipUpdateCheck);
    await store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, checkUpdateByStringify).pipe(take(1)).toPromise();
    expect(nFetchesCalled).toBe(0);
    done();
  });

  it('should not call fetchFn for RefreshMode.DoNotRefresh', async (done) => {
    let nFetchesCalled = 0;
    const key = 'Key';
    const value = 'Value';

    class TestStoreAdapter extends NoOpAsyncStore {
      get = <T>(k: string): Promise<T|undefined> => (Promise.resolve(k === key ? value : undefined) as unknown as Promise<T|undefined>);
    }

    const fetchFn = () => {
      nFetchesCalled++;
      return of('?');
    };
    const store = new ObservableStoreImpl(() => new TestStoreAdapter());
    await store.set<string>(key, value, skipUpdateCheck);
    const result = await store.get<string>(key, fetchFn, RefreshMode.DoNotRefresh, checkUpdateByStringify).pipe(take(1)).toPromise();
    expect(nFetchesCalled).toBe(0);
    expect(result).toBe(value);
    done();
  });

  it('should call fetchFn for RefreshMode.Refresh for all gets', async (done) => {
    let nFetchesCalled = 0;
    const key = 'Key';
    const value = 'Value';
    const fetchFn = () => {
      nFetchesCalled++;
      return of(value);
    };
    const store = newObservableStoreForTest();
    await store.get<string>(key, fetchFn, RefreshMode.Refresh, checkUpdateByStringify).pipe(take(1)).toPromise();
    await store.get<string>(key, fetchFn, RefreshMode.Refresh, checkUpdateByStringify).pipe(take(1)).toPromise();
    await store.get<string>(key, fetchFn, RefreshMode.Refresh, checkUpdateByStringify).pipe(take(1)).toPromise();
    await store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, checkUpdateByStringify).pipe(take(1)).toPromise();
    await store.get<string>(key, fetchFn, RefreshMode.DoNotRefresh, checkUpdateByStringify).pipe(take(1)).toPromise();
    expect(nFetchesCalled).toBe(3);
    done();
  });

  it('should return store value when RefreshMode.DoNotRefresh and no fetchFn provided', async (done) => {
    const store = newObservableStoreForTest();
    const result = await store.get<string>('some key', undefined, RefreshMode.DoNotRefresh, skipUpdateCheck).pipe(take(1)).toPromise();
    expect(result).toBeUndefined();
    done();
  });

  it('should not be blocked by gets with no subscription', async (done) => {
    const key = 'Key';
    const value = 'Value';
    const fetchFn = () => {
      return of(value);
    };
    const store = newObservableStoreForTest();
    store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, skipUpdateCheck);
    const o2 = store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, skipUpdateCheck);
    const res = await o2.pipe(take(1)).toPromise();
    expect(res).toBe(value);
    done();
  });

  it('should not fetch twice with RefreshMode.RefreshOncePerSession when init is delayed', async (done) => {
    const key = 'Key';
    const value = 'Value';
    let nFetchesCalled = 0;
    const fetchFn = () => {
      nFetchesCalled++;
      return of(value);
    };
    const store = newObservableStoreForTest();
    const o1 = store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, skipUpdateCheck);
    const o2 = store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, skipUpdateCheck);
    const res1 = await o1.pipe(take(1)).toPromise();
    const res2 = await o2.pipe(take(1)).toPromise();
    expect(res1).toBe(value);
    expect(res2).toBe(value);
    expect(nFetchesCalled).toBe(1);
    done();
  });

  // TODO: add tests for error handling!
});
