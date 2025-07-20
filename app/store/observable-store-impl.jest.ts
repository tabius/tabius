import { firstValueFrom, Observable, of, ReplaySubject } from 'rxjs';
import { delay, switchMap } from 'rxjs/operators';
import { ObservableStore, RefreshMode, skipUpdateCheck } from './observable-store';
import { ObservableStoreImpl } from './observable-store-impl';
import { InMemoryAsyncStore } from '@app/store/in-memory-async-store';

describe('ObservableStoreImpl', () => {
  it('fetches and sets value to adapter if it was missed', async () => {
    let setKey = '';
    let setValue: any = undefined;

    class AsyncStoreForTest extends BaseAsyncStoreForTest {
      set<T>(key: string, value: T | undefined): Promise<void> {
        setKey += key; // A way to check that 'set' was called only once.
        setValue = value;
        return super.set(key, value);
      }
    }

    const store = new ObservableStoreImpl(() => new AsyncStoreForTest());
    const fetchedValue = await firstValueFrom(store.get('key', () => of('fetched'), RefreshMode.DoNotRefresh, skipUpdateCheck));

    expect(fetchedValue).toBe('fetched');
    expect(setKey).toBe('key');
    expect(setValue).toBe('fetched');
  });

  it('should not call fetchFn for RefreshMode.RefreshOnce if there was a set before', async () => {
    let nFetchesCalled = 0;
    const store = newObservableStoreForTest();

    await store.set('Key', 'Value', skipUpdateCheck);
    await firstValueFrom(store.get('Key', () => of(nFetchesCalled++), RefreshMode.RefreshOnce, checkUpdateByStringify));

    expect(nFetchesCalled).toBe(0);
  });

  it('should not call fetchFn for RefreshMode.DoNotRefresh', async () => {
    let nFetchesCalled = 0;
    const store = newObservableStoreForTest();

    await store.set('Key', 'Value', skipUpdateCheck);
    const result = await firstValueFrom(
      store.get('Key', () => of(nFetchesCalled++), RefreshMode.DoNotRefresh, checkUpdateByStringify),
    );

    expect(nFetchesCalled).toBe(0);
    expect(result).toBe('Value');
  });

  it('should call fetchFn for RefreshMode.Refresh for all gets', async () => {
    let nFetchesCalled = 0;
    const store = newObservableStoreForTest();
    const fetchFn = () => of(nFetchesCalled++);

    await firstValueFrom(store.get('Key', fetchFn, RefreshMode.Refresh, checkUpdateByStringify));
    await firstValueFrom(store.get('Key', fetchFn, RefreshMode.Refresh, checkUpdateByStringify));
    await firstValueFrom(store.get('Key', fetchFn, RefreshMode.Refresh, checkUpdateByStringify));
    // These next two should not fetch.
    await firstValueFrom(store.get('Key', fetchFn, RefreshMode.RefreshOnce, checkUpdateByStringify));
    await firstValueFrom(store.get('Key', fetchFn, RefreshMode.DoNotRefresh, checkUpdateByStringify));

    expect(nFetchesCalled).toBe(3);
  });

  it('should return undefined when RefreshMode.DoNotRefresh and no fetchFn provided', async () => {
    const store = newObservableStoreForTest();
    const result = await firstValueFrom(store.get('some key', undefined, RefreshMode.DoNotRefresh, skipUpdateCheck));
    expect(result).toBeUndefined();
  });

  it('should not be blocked by gets with no subscription', async () => {
    const store = newObservableStoreForTest();
    store.get('Key', () => of('Value'), RefreshMode.RefreshOnce, skipUpdateCheck); // Fire and forget
    const res = await firstValueFrom(store.get('Key', () => of('Value'), RefreshMode.RefreshOnce, skipUpdateCheck));
    expect(res).toBe('Value');
  });

  it('should serialize concurrent set() calls for the same key', async () => {
    const callOrder: string[] = [];
    const resolver = new ReplaySubject<void>(1);

    class TestStore extends BaseAsyncStoreForTest {
      async set<T>(_key: string, value: T | undefined): Promise<void> {
        callOrder.push(`start set ${value}`);
        await firstValueFrom(resolver);
        callOrder.push(`end set ${value}`);
      }
    }

    const store = new ObservableStoreImpl(() => new TestStore());

    const set1_Promise = store.set('key', 'value1', skipUpdateCheck);
    const set2_Promise = store.set('key', 'value2', skipUpdateCheck);

    resolver.next(); // Unblock the first set operation
    await Promise.all([set1_Promise, set2_Promise]);

    expect(callOrder).toEqual(['start set value1', 'end set value1', 'start set value2', 'end set value2']);
  });

  it('should clear all internal state and allow RefreshOnce to work again', async () => {
    let fetchCount = 0;
    const store = newObservableStoreForTest();

    await firstValueFrom(store.get('my-key', () => of(fetchCount++), RefreshMode.RefreshOnce, skipUpdateCheck));
    expect(fetchCount).toBe(1);
    await firstValueFrom(store.get('my-key', () => of(fetchCount++), RefreshMode.RefreshOnce, skipUpdateCheck));
    expect(fetchCount).toBe(1);

    await store.clear();

    await firstValueFrom(store.get('my-key', () => of(fetchCount++), RefreshMode.RefreshOnce, skipUpdateCheck));
    expect(fetchCount).toBe(2);
  });

  it('should handle fetch errors gracefully and return undefined', async () => {
    const fetchFn = () => new Observable(s => s.error(new Error('Network Failed')));
    const store = newObservableStoreForTest();

    const result = await firstValueFrom(store.get('error-key', fetchFn, RefreshMode.Refresh, skipUpdateCheck));
    expect(result).toBeUndefined();

    const result2 = await firstValueFrom(store.get('error-key', () => of('success'), RefreshMode.Refresh, skipUpdateCheck));
    expect(result2).toBe('success');
  });

  it('should not call the underlying store.set() if checkUpdateFn returns false', async () => {
    const asyncStore = new BaseAsyncStoreForTest();
    const store = newObservableStoreForTest(asyncStore);
    const updateIsNeverNeeded = () => false;

    await store.set('key', 'initial value', updateIsNeverNeeded);
    // The store first GETS the old value (finds undefined), then SETS the new one.
    expect(asyncStore.calls).toEqual(['get', 'set']);

    await store.set('key', 'new value', updateIsNeverNeeded);
    // The store GETS the old value, the check returns false, and it stops. No new SET.
    expect(asyncStore.calls).toEqual(['get', 'set', 'get']);
  });

  it('set of exising value', async () => {
    const key = 'Key';
    const value = 'value';
    const asyncStore = new BaseAsyncStoreForTest();
    await asyncStore.set(key, value);
    const store = newObservableStoreForTest(asyncStore);
    await store.set(key, value, checkUpdateByStringify);

    const v1 = await firstValueFrom(store.get<string>(key, undefined, RefreshMode.DoNotRefresh, checkUpdateByStringify));
    expect(v1).toBe(value);
  });


  it('should remove a value from the store', async () => {
    const map = new Map<string, any>();

    class TestStore extends BaseAsyncStoreForTest {
      get = <T>(key: string): Promise<T | undefined> => Promise.resolve(map.get(key));
      set = <T>(key: string, value: T | undefined): Promise<void> => {
        value === undefined ? map.delete(key) : map.set(key, value);
        return Promise.resolve();
      };
    }

    const store = new ObservableStoreImpl(() => new TestStore());

    await store.set('key-to-remove', 'hello', skipUpdateCheck);
    let value = await firstValueFrom(store.get('key-to-remove', undefined, RefreshMode.DoNotRefresh, skipUpdateCheck));
    expect(value).toBe('hello');

    await store.remove('key-to-remove');
    value = await firstValueFrom(store.get('key-to-remove', undefined, RefreshMode.DoNotRefresh, skipUpdateCheck));
    expect(value).toBeUndefined();
  });

  it('should respect RefreshMode.RefreshOnce', async () => {
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

  it('should respect RefreshMode.RefreshOnce for a stored value', async () => {
    let nFetchesCalled = 0;
    const fetchFn = () => {
      nFetchesCalled++;
      return of('value');
    };

    const key = 'Key';
    const asyncStore = new BaseAsyncStoreForTest();
    await asyncStore.set(key, 'value');
    const store = newObservableStoreForTest(asyncStore);

    const v1 = await firstValueFrom(store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, checkUpdateByStringify));
    const v2 = await firstValueFrom(store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, checkUpdateByStringify));
    expect(v1).toBe(v2);
    expect(nFetchesCalled).toBe(1);
  });

  it('should respect RefreshMode.RefreshOnce after DoNotRefresh for a stored value', async () => {
    let nFetchesCalled = 0;
    const fetchFn = () => {
      nFetchesCalled++;
      return of('value');
    };

    const key = 'Key';
    const asyncStore = new BaseAsyncStoreForTest();
    await asyncStore.set(key, 'value');
    const store = newObservableStoreForTest(asyncStore);

    const v1 = await firstValueFrom(store.get<string>(key, undefined, RefreshMode.DoNotRefresh, checkUpdateByStringify));
    expect(nFetchesCalled).toBe(0);
    const v2 = await firstValueFrom(store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, checkUpdateByStringify));
    expect(nFetchesCalled).toBe(1);
    const v3 = await firstValueFrom(store.get<string>(key, fetchFn, RefreshMode.RefreshOnce, checkUpdateByStringify));
    expect(nFetchesCalled).toBe(1);
    expect(v1).toBe(v2);
    expect(v1).toBe(v3);
    expect(nFetchesCalled).toBe(1);
  });

  it('should not call fetchFn twice for RefreshMode.RefreshOnce in parallel', async () => {
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

  it('should not call fetchFn twice for RefreshMode.RefreshOnce in parallel with delay', async () => {
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
});

// A mock update function for tests that need one.
function checkUpdateByStringify(a?: unknown, b?: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

/** A tracking impl used in tests. */
class BaseAsyncStoreForTest extends InMemoryAsyncStore {
  calls: string[] = [];

  override get<T = unknown>(key: string): Promise<T | undefined> {
    this.calls.push('get');
    return super.get(key);
  }

  set<T = unknown>(key: string, value: T | undefined): Promise<void> {
    this.calls.push('set');
    return super.set(key, value);
  }

  clear(): Promise<void> {
    this.calls.push('clear');
    return super.clear();
  }
}

function newObservableStoreForTest(asyncStore = new BaseAsyncStoreForTest()): ObservableStore {
  return new ObservableStoreImpl(() => asyncStore);
}
