import {IndexedDbStoreAdapter} from '@app/store/indexed-db-store-adapter';
import {LocalStorageStoreAdapter} from '@app/store/local-storage-store-adapter';
import {StoreAdapter} from '@app/store/store-adapter';
import {InMemoryStoreAdapter} from '@app/store/in-memory-store-adapter';
import {USER_STORE_NAME} from '@common/constants';

describe('Store adapter [IndexedDb]', () => {
  it('should support simple get and set operations', async () => {
    await testGetAndSet(new IndexedDbStoreAdapter(USER_STORE_NAME));
  });

  it('should support list operation', async () => {
    await testList(new IndexedDbStoreAdapter(USER_STORE_NAME));
  });

  it('should remove entries when value is undefined', async () => {
    await testRemove(new IndexedDbStoreAdapter(USER_STORE_NAME));
  });

  it('should clear all entries when clear() is called', async () => {
    await testClear(new IndexedDbStoreAdapter(USER_STORE_NAME));
  });

  it('should support getAll method', async () => {
    await testGetAll(new IndexedDbStoreAdapter(USER_STORE_NAME));
  });

  it('should support setAll method', async () => {
    await testSetAll(new IndexedDbStoreAdapter(USER_STORE_NAME));
  });
});

describe('Store adapter [LocalStorage]', () => {
  it('should support simple get and set operations', async () => {
    await testGetAndSet(new LocalStorageStoreAdapter('test-get-and-set'));
  });

  it('should support list operation', async () => {
    await testList(new LocalStorageStoreAdapter('test-list'));
  });

  it('should remove entries when value is undefined', async () => {
    await testRemove(new LocalStorageStoreAdapter('test-remove'));
  });

  it('should clear all entries when clear() is called', async () => {
    await testClear(new LocalStorageStoreAdapter('test-clear'));
  });

  it('should support getAll method', async () => {
    await testGetAll(new LocalStorageStoreAdapter('test-getAll'));
  });

  it('should support setAll method', async () => {
    await testSetAll(new LocalStorageStoreAdapter('test-setAll'));
  });
});

describe('Store adapter [Memory]', () => {
  it('should support simple get and set operations', async () => {
    await testGetAndSet(new InMemoryStoreAdapter());
  });

  it('should support list operation', async () => {
    await testList(new InMemoryStoreAdapter());
  });

  it('should remove entries when value is undefined', async () => {
    await testRemove(new InMemoryStoreAdapter());
  });

  it('should clear all entries when clear() is called', async () => {
    await testClear(new InMemoryStoreAdapter());
  });

  it('should support getAll method', async () => {
    await testGetAll(new InMemoryStoreAdapter());
  });

  it('should support setAll method', async () => {
    await testSetAll(new InMemoryStoreAdapter());
  });
});

async function testGetAndSet(adapter: StoreAdapter) {
  const key = 'k1';
  const value = {a: 1};
  await adapter.set(key, value);
  const result = await adapter.get(key);
  expect(result).toBeDefined();
  expect(JSON.stringify(result)).toEqual(JSON.stringify(value));
}

async function testList(adapter: StoreAdapter) {
  const keys = ['k1', 'k2', 'k22', 'k3'];
  for (const key of keys) {
    await adapter.set(key, {foo: key});
  }
  const result = await adapter.list<any>('k2');
  expect(result).toBeDefined();
  expect(result.length).toEqual(2);
  result.sort((e1, e2) => e1.foo.localeCompare(e2.foo));
  expect(result[0].foo).toEqual('k2');
  expect(result[1].foo).toEqual('k22');
}

async function testRemove(adapter: StoreAdapter) {
  const keyPrefix = 'remove';
  const key1 = `${keyPrefix}1`;
  const key2 = `${keyPrefix}2`;
  await adapter.set(key1, {x: 'value'});
  await adapter.set(key2, {x: 'value2'});

  const list1 = await adapter.list<any>(keyPrefix);
  expect(list1).toBeDefined();
  expect(list1.length).toEqual(2);

  await adapter.set(key1, undefined);
  const k1 = await adapter.get(key1);
  expect(k1).toBeUndefined();

  const k2 = await adapter.get(key2);
  expect(k2).toBeDefined();

  const list2 = await adapter.list<any>(keyPrefix);
  expect(list2).toBeDefined();
  expect(list2.length).toEqual(1);
  expect(list2[0].x).toEqual('value2');
}

async function testClear(adapter: StoreAdapter) {
  const keyPrefix = 'clear';
  const key1 = `${keyPrefix}1`;
  const key2 = `${keyPrefix}2`;
  Promise.all([await adapter.set(key1, {x: 'value'}), await adapter.set(key2, {x: 'value2'})]);

  const list1 = await adapter.list<any>(keyPrefix);
  expect(list1).toBeDefined();
  expect(list1.length).toEqual(2);

  await adapter.clear();

  const k1 = await adapter.get(key1);
  expect(k1).toBeUndefined();

  const k2 = await adapter.get(key2);
  expect(k2).toBeUndefined();

  const list = await adapter.list('');
  expect(list.length).toBe(0);
}

async function testGetAll(adapter: StoreAdapter) {
  await Promise.all([
    adapter.set('k1', 'v1'),
    adapter.set('k2', 'v2'),
    adapter.set('k3', 'v3'),
  ]);

  const result1: (string|undefined)[] = await adapter.getAll(['k1', 'k3']);
  expect(result1).toBeDefined();
  expect(result1.length).toBe(2);
  expect(result1.sort()).toEqual(['v1', 'v3']);

  const result2: (string|undefined)[] = await adapter.getAll(['k2', 'k4']);
  expect(result2).toBeDefined();
  expect(result2.length).toBe(2);
  expect(result2.sort()).toEqual(['v2', undefined]);
}

async function testSetAll(adapter: StoreAdapter) {
  const map = {'k1': 'k1-value', 'k2': 'k2-value'};

  await adapter.setAll(map);
  const result = await adapter.list('k');

  // todo: contract for undefined?

  expect(result).toBeDefined();
  expect(result.length).toBe(2);
  expect(result.sort()).toEqual(['k1-value', 'k2-value']);
}
