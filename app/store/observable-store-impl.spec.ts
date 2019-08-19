import {InMemoryStoreAdapter} from '@app/store/in-memory-store-adapter';
import {ObservableStoreImpl} from '@app/store/observable-store-impl';

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

  // it('executes set ops in order', async (done) => {
  //   const adapter = new InMemoryStoreAdapter();
  //   const store = new ObservableStoreImpl('name1', true, () => adapter, new TransferState(), 1);
  //   const key = 'k', value = 'v';
  //   // noinspection ES6MissingAwait
  //   const p1 = store.set(key, value, checkUpdateByReference);
  //   const p2 = store.set(key, value, checkUpdateByReference);
  //   const p3 = store.set(key, value, checkUpdateByReference);
  //   done();
  // });
});
