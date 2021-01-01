import {AsyncStore} from './async-store';
import {InMemoryAsyncStore} from './in-memory-async-store';
import {LocalStorageAsyncStore} from './local-storage-async-store';
import {IndexedDbAsyncStore} from './indexed-db-async-store';


interface TestListItem {
  foo: string;
}

let uniqueStoreCounter = 0;

/** Generates unique store name for tests. */
function genUniqueStoreName(): string {
  return `test-store-${++uniqueStoreCounter}`;
}

function genUniqueIndexDbName(): string {
  return `test-db-${++uniqueStoreCounter}`;
}

describe('Async Store Adapter', () => {

  describe('should support "get" and "set"', () => {
    async function test(store: AsyncStore): Promise<void> {
      let key = 'k1';
      const value1 = {a: 1};
      await store.set(key, value1);
      let result = await store.get(key);
      expect(result).toBeDefined();
      expect(JSON.stringify(result)).toEqual(JSON.stringify(value1));

      const value2 = null;
      await store.set(key, value2);
      result = await store.get(key);
      expect(result).toBe(null);
    }

    it('InMemory', async () => await test(new InMemoryAsyncStore()));

    it('LocalStorage', async () => await test(new LocalStorageAsyncStore(genUniqueStoreName())));

    it('IndexedDb', async () => await test(new IndexedDbAsyncStore(genUniqueIndexDbName(), genUniqueStoreName())));
  });

  describe('should support "list"', () => {
    async function test(store: AsyncStore): Promise<void> {
      const keys = ['k1', 'k2', 'k22', 'k3'];
      for (const key of keys) {
        await store.set<TestListItem>(key, {foo: key + '-foo'});
      }
      const result = await store.list<TestListItem>('k2');
      expect(result).toBeDefined();
      expect(result.length).toEqual(2);
      result.sort((e1, e2) => e1.key.localeCompare(e2.key));

      expect(result[0].key).toEqual('k2');
      expect(result[0].value.foo).toEqual('k2-foo');

      expect(result[1].key).toEqual('k22');
      expect(result[1].value.foo).toEqual('k22-foo');
    }

    it('InMemory', async () => await test(new InMemoryAsyncStore()));

    it('LocalStorage', async () => await test(new LocalStorageAsyncStore(genUniqueStoreName())));

    it('IndexedDb', async () => await test(new IndexedDbAsyncStore(genUniqueIndexDbName(), genUniqueStoreName())));
  });

  describe('should remove entries when value is undefined', () => {
    async function test(store: AsyncStore): Promise<void> {
      const keyPrefix = 'remove';
      const key1 = `${keyPrefix}1`;
      const key2 = `${keyPrefix}2`;
      await store.set(key1, {x: 'value'});
      await store.set(key2, {x: 'value2'});

      const list1 = await store.list<any>(keyPrefix);
      expect(list1).toBeDefined();
      expect(list1.length).toEqual(2);

      await store.set(key1, undefined);
      const k1 = await store.get(key1);
      expect(k1).toBeUndefined();

      const k2 = await store.get(key2);
      expect(k2).toBeDefined();

      const list2 = await store.list<any>(keyPrefix);
      expect(list2).toBeDefined();
      expect(list2.length).toEqual(1);
      expect(list2[0].value.x).toEqual('value2');
    }

    it('InMemory', async () => await test(new InMemoryAsyncStore()));

    it('LocalStorage', async () => await test(new LocalStorageAsyncStore(genUniqueStoreName())));

    it('IndexedDb', async () => await test(new IndexedDbAsyncStore(genUniqueIndexDbName(), genUniqueStoreName())));
  });

  describe('should support "getAll"', () => {
    async function test(store: AsyncStore): Promise<void> {
      await Promise.all([
        store.set('k1', 'v1'),
        store.set('k2', 'v2'),
        store.set('k3', 'v3'),
      ]);

      const result1: (string|null|undefined)[] = await store.getAll(['k1', 'k3']);
      expect(result1).toBeDefined();
      expect(result1.length).toBe(2);
      expect(result1.sort()).toEqual(['v1', 'v3']);

      const result2: (string|null|undefined)[] = await store.getAll(['k2', 'k4']);
      expect(result2).toBeDefined();
      expect(result2.length).toBe(2);
      expect(result2.sort()).toEqual(['v2', undefined]);
    }


    it('InMemory', async () => await test(new InMemoryAsyncStore()));

    it('LocalStorage', async () => await test(new LocalStorageAsyncStore(genUniqueStoreName())));

    it('IndexedDb', async () => await test(new IndexedDbAsyncStore(genUniqueIndexDbName(), genUniqueStoreName())));
  });

  describe('should support "setAll"', () => {
    async function test(store: AsyncStore): Promise<void> {
      await store.setAll({'k1': 'k1-value', 'k2': 'k2-value'});
      const result = await store.list('k');
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      result.sort((e1, e2) => e1.key.localeCompare(e2.key));
      expect(result).toEqual([{key: 'k1', value: 'k1-value'}, {key: 'k2', value: 'k2-value'}]);
    }

    it('InMemory', async () => await test(new InMemoryAsyncStore()));

    it('LocalStorage', async () => await test(new LocalStorageAsyncStore(genUniqueStoreName())));

    it('IndexedDb', async () => await test(new IndexedDbAsyncStore(genUniqueIndexDbName(), genUniqueStoreName())));
  });

  describe('should support "clear"', () => {
    async function test(store: AsyncStore): Promise<void> {
      const keyPrefix = 'clear';
      const key1 = `${keyPrefix}1`;
      const key2 = `${keyPrefix}2`;
      await Promise.all([store.set(key1, {x: 'value'}), store.set(key2, {x: 'value2'})]);

      const list1 = await store.list<any>(keyPrefix);
      expect(list1).toBeDefined();
      expect(list1.length).toEqual(2);

      await store.clear();

      const k1 = await store.get(key1);
      expect(k1).toBeUndefined();

      const k2 = await store.get(key2);
      expect(k2).toBeUndefined();

      const list = await store.list('');
      expect(list.length).toBe(0);
    }

    it('InMemory', async () => await test(new InMemoryAsyncStore()));

    it('LocalStorage', async () => await test(new LocalStorageAsyncStore(genUniqueStoreName())));

    it('IndexedDb', async () => await test(new IndexedDbAsyncStore(genUniqueIndexDbName(), genUniqueStoreName())));
  });

});
