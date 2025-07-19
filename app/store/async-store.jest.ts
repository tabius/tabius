/**
 * @jest-environment jsdom
 */
import 'fake-indexeddb/auto';
import { AsyncStore } from './async-store';
import { InMemoryAsyncStore } from './in-memory-async-store';
import { LocalStorageAsyncStore } from './local-storage-async-store';
import { IndexedDbAsyncStore } from './indexed-db-async-store';

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
      const key = 'k1';
      const value1 = { a: 1 };
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
        await store.set<TestListItem>(key, { foo: key + '-foo' });
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

  describe('should handle list edge cases', () => {
    async function test(store: AsyncStore): Promise<void> {
      await store.set('a1', 'v1');
      await store.set('a2', 'v2');
      await store.set('b1', 'v3');

      // List with empty string should return all items.
      const allItems = await store.list('');
      expect(allItems.length).toBe(3);

      // List with undefined should also return all items.
      const allItemsAgain = await store.list(undefined);
      expect(allItemsAgain.length).toBe(3);

      // List with a non-matching prefix should return empty array
      const noItems = await store.list('c');
      expect(noItems.length).toBe(0);
    }

    it('InMemory', async () => await test(new InMemoryAsyncStore()));
    it('LocalStorage', async () => await test(new LocalStorageAsyncStore(genUniqueStoreName())));
    it('IndexedDb', async () => await test(new IndexedDbAsyncStore(genUniqueIndexDbName(), genUniqueStoreName())));
  });

  describe('should ensure stores are isolated', () => {
    // This test is most critical for LocalStorage and IndexedDb, but we run it on all for consistency.
    async function test(store1: AsyncStore, store2: AsyncStore): Promise<void> {
      await store1.set('key1', 'store1-value');
      await store2.set('key2', 'store2-value');

      // Check that stores contain their own keys.
      expect(await store1.get('key1')).toBe('store1-value');
      expect(await store2.get('key2')).toBe('store2-value');

      // Check that stores DO NOT contain each other's keys
      expect(await store1.get('key2')).toBeUndefined();
      expect(await store2.get('key1')).toBeUndefined();

      // Check that clearing one store does not affect the other
      await store2.clear();
      expect(await store1.get('key1')).toBe('store1-value');
      expect(await store2.get('key2')).toBeUndefined();
    }

    it('InMemory', async () => await test(new InMemoryAsyncStore(), new InMemoryAsyncStore()));
    it('LocalStorage', async () =>
      await test(new LocalStorageAsyncStore(genUniqueStoreName()), new LocalStorageAsyncStore(genUniqueStoreName())));
    it('IndexedDb', async () => {
      const dbName1 = genUniqueIndexDbName();
      const dbName2 = genUniqueIndexDbName();
      await test(new IndexedDbAsyncStore(dbName1, genUniqueStoreName()), new IndexedDbAsyncStore(dbName2, genUniqueStoreName()));
    });
  });

  describe('should remove entries when value is undefined', () => {
    async function test(store: AsyncStore): Promise<void> {
      const keyPrefix = 'remove';
      const key1 = `${keyPrefix}1`;
      const key2 = `${keyPrefix}2`;
      await store.set(key1, { x: 'value' });
      await store.set(key2, { x: 'value2' });

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
      await Promise.all([store.set('k1', 'v1'), store.set('k2', 'v2'), store.set('k3', 'v3')]);

      const result1: (string | null | undefined)[] = await store.getAll(['k1', 'k3']);
      expect(result1).toBeDefined();
      expect(result1.length).toBe(2);
      expect(result1.sort()).toEqual(['v1', 'v3']);

      const result2: (string | null | undefined)[] = await store.getAll(['k2', 'k4']);
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
      await store.setAll({ k1: 'k1-value', k2: 'k2-value' });
      const result = await store.list('k');
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      result.sort((e1, e2) => e1.key.localeCompare(e2.key));
      expect(result).toEqual([
        { key: 'k1', value: 'k1-value' },
        { key: 'k2', value: 'k2-value' },
      ]);
    }

    it('InMemory', async () => await test(new InMemoryAsyncStore()));
    it('LocalStorage', async () => await test(new LocalStorageAsyncStore(genUniqueStoreName())));
    it('IndexedDb', async () => await test(new IndexedDbAsyncStore(genUniqueIndexDbName(), genUniqueStoreName())));
  });

  describe('should correctly overwrite with "setAll"', () => {
    async function test(store: AsyncStore): Promise<void> {
      await store.set('k1', 'initial-value');
      await store.set('k2', 'untouched-value');

      await store.setAll({
        k1: 'overwritten-value', // Overwrite existing key.
        k3: 'new-value', // Add a new key.
      });

      expect(await store.get('k1')).toBe('overwritten-value');
      expect(await store.get('k2')).toBe('untouched-value');
      expect(await store.get('k3')).toBe('new-value');
    }

    it('InMemory', async () => await test(new InMemoryAsyncStore()));
    it('LocalStorage', async () => await test(new LocalStorageAsyncStore(genUniqueStoreName())));
    it('IndexedDb', async () => await test(new IndexedDbAsyncStore(genUniqueIndexDbName(), genUniqueStoreName())));
  });

  describe('should handle empty and special character keys', () => {
    async function test(store: AsyncStore): Promise<void> {
      // Test empty key.
      await store.set('', 'value for empty key');
      expect(await store.get('')).toBe('value for empty key');

      // Test empty value.
      await store.set('key for empty value', '');
      expect(await store.get('key for empty value')).toBe('');

      // Test special characters in key.
      const specialKey = 'key-with/special characters!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
      await store.set(specialKey, 'special value');
      expect(await store.get(specialKey)).toBe('special value');
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
      await Promise.all([store.set(key1, { x: 'value' }), store.set(key2, { x: 'value2' })]);

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
