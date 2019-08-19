import {InMemoryStoreAdapter} from '@app/store/in-memory-store-adapter';
import {ObservableStoreImpl} from '@app/store/observable-store-impl';
import {KV, StoreAdapter} from '@app/store/store-adapter';
import {RefreshMode, skipUpdateCheck} from '@app/store/observable-store';
import {take} from 'rxjs/operators';
import {of} from 'rxjs';

/** No-Op impl used in tests. */
class NoOpStoreAdapter implements StoreAdapter {
  calls: string[] = [];

  clear(): Promise<void> {
    this.calls.push('clear');
    return Promise.resolve();
  }

  get<T>(key: string): Promise<T|undefined> {
    this.calls.push('get');
    return Promise.resolve(undefined);
  }

  getAll<T>(keys: ReadonlyArray<string>): Promise<(T|undefined)[]> {
    this.calls.push('getAll');
    return Promise.resolve([]);
  }

  init(schemaVersion: number): Promise<void> {
    this.calls.push('init');
    return Promise.resolve();
  }

  list<T>(keyPrefix?: string): Promise<KV<T>[]> {
    this.calls.push('list');
    return Promise.resolve([]);
  }

  set<T>(key: string, value: T|undefined): Promise<void> {
    this.calls.push('set');
    return Promise.resolve();
  }

  setAll(map: { [p: string]: any }): Promise<void> {
    this.calls.push('setAll');
    return Promise.resolve();
  }

  snapshot(): KV<unknown>[] {
    this.calls.push('snapshot');
    return [];
  }

}

describe('ObservableStore', () => {

  it('calls store adapter factory with correct params', () => {
    let calledName = '';
    let calledBrowser: boolean|undefined = undefined;
    const adapterFactory = (name, browser) => {
      calledName = name;
      calledBrowser = browser;
      return new InMemoryStoreAdapter();
    };

    new ObservableStoreImpl('name1', true, adapterFactory);
    expect(calledName).toBe('name1');
    expect(calledBrowser).toBeTruthy();

    new ObservableStoreImpl('name2', false, adapterFactory);
    expect(calledName).toBe('name2');
    expect(calledBrowser).toBeFalsy();
  });

  it('never calls set or get on un-initialized adapter', async (done) => {
    let initCalled = false;
    let markAdapterAsInitialized: () => void = () => {
    };

    class StoreAdapter extends NoOpStoreAdapter {
      init(schemaVersion: number): Promise<void> {
        const promise = new Promise<void>(resolve => {
          initCalled = true;
          markAdapterAsInitialized = resolve;
        });
        return Promise.all([super.init(schemaVersion), promise]) as any as Promise<void>;
      }

      get<T>(key: string): Promise<T|undefined> {
        return super.get(key).then(() => 'value' as any as T);
      }
    }

    const adapter = new StoreAdapter();
    const store = new ObservableStoreImpl('name', true, () => adapter);
    expect(initCalled).toBeTruthy();

    // noinspection ES6MissingAwait
    const set$$ = store.set('key', 'value', skipUpdateCheck);
    expect(adapter.calls.filter(n => n === 'set').length).toBe(0);

    const get$$ = store.get<string>('key', undefined, RefreshMode.DoNotRefresh, skipUpdateCheck).pipe(take(1)).toPromise();
    expect(adapter.calls.filter(n => n === 'get').length).toBe(0);

    markAdapterAsInitialized();

    await Promise.all([set$$, get$$]);
    expect(adapter.calls.filter(n => n === 'set').length).toBe(1);
    expect(adapter.calls.filter(n => n === 'get').length).toBe(1);
    done();
  });

  it('fetches and sets value to adapter if it was missed', async (done) => {
    let setKey = '';
    let setValue: any = undefined;

    class StoreAdapter extends NoOpStoreAdapter {
      set<T>(key: string, value: T|undefined): Promise<void> {
        setKey += key; // this way we check that we 'set' only once.
        setValue = value;
        return Promise.resolve();
      }
    }

    const adapter = new StoreAdapter();
    const store = new ObservableStoreImpl('name', true, () => adapter);

    const getKey = 'key';
    const fetchedValue = 'fetched';
    const get$$ = store.get<string>(getKey, () => of(fetchedValue), RefreshMode.DoNotRefresh, skipUpdateCheck).pipe(take(1)).toPromise();
    const returnValue = await get$$;

    expect(returnValue).toBe(fetchedValue);
    expect(setKey).toBe(getKey);
    expect(setValue).toBe(fetchedValue);

    done();
  });

});
