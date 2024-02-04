import { expectGet } from './utils';
import { Collection } from '@common/catalog-model';
import { TResponse } from '@backend/handlers/handler';

const collection1497 = {
  id: 1497,
  listed: true,
  mount: 'gran-kurazh',
  name: 'Гран-КуражЪ',
  type: 2,
  version: 2,
};

describe('collection', () => {
  describe('by-mount', () => {
    test('returns expected result', async () => {
      await expectGet<Collection>('/api/collection/by-mount/gran-kurazh', 200, collection1497);
    });

    test('returns NOT_FOUND on not found mount', async () => {
      await expectGet<TResponse>('/api/collection/by-mount/unknown', 404, {
        statusCode: 404,
        message: 'Collection is not found unknown',
      });
    });

    test('returns BAD_REQUEST on invalid mount ', async () => {
      const badMount = 'a'.repeat(50);
      await expectGet<TResponse>(`/api/collection/by-mount/${badMount}`, 400, {
        statusCode: 400,
        message: `Invalid collection mount: <string:${badMount}>`,
      });
    });
  });

  describe('by-ids', () => {
    test('works as expected for one id', async () => {
      await expectGet<Array<Collection>>('/api/collection/by-ids/1497', 200, [collection1497]);
    });

    test('can return multiple collections', async () => {
      await expectGet<Array<Collection>>('/api/collection/by-ids/1497,1498', 200, [
        collection1497,
        {
          id: 1498,
          listed: true,
          mount: 'krupnov-anatolij',
          name: 'Крупнов Анатолий',
          type: 1,
          version: 2,
        },
      ]);
    });

    test('if collection is not found ignores it and does not fail', async () => {
      await expectGet<Array<Collection | null>>('/api/collection/by-ids/10000000', 200, []);
    });

    test('if collection is listed twice, returns it only once', async () => {
      await expectGet<Array<Collection | null>>('/api/collection/by-ids/1497,1497', 200, [collection1497]);
    });

    test('returns error for non-numeric ids', async () => {
      await expectGet<TResponse>('/api/collection/by-ids/a,1497', 400, {
        statusCode: 400,
        message: `Invalid list of ids: <string:a,1497>`,
      });
    });
  });

  describe('all-listed', () => {
    test('works as expected ', async () => {
      await expectGet<Array<Collection>>('/api/collection/all-listed', 200, collections => {
        expect(collections.length).toBeGreaterThanOrEqual(300);
        expect(collections.some(c => c.id === collection1497.id)).toBe(true);
        return true;
      });
    });
  });
});
