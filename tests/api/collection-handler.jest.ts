import { expectGet, expectPut } from './utils';
import { Collection, CollectionDetails } from '@common/catalog-model';
import { GetUserCollectionsResponse, UpdateCollectionRequest } from '@common/api-model';
import { ApiResponse, UNAUTHORIZED_STATUS } from '@backend/handlers/protocol';

const collection1497 = {
  id: 1497,
  listed: true,
  mount: 'gran-kurazh',
  name: 'Гран-КуражЪ',
  type: 2,
  version: 2,
};

const userFavCollectionId = 2083;

describe('collection', () => {
  describe('get', () => {
    describe('by-mount', () => {
      test('returns expected result', async () => {
        await expectGet<Collection>('/api/collection/by-mount/gran-kurazh', 200, collection1497);
      });

      test('returns NOT_FOUND on not found mount', async () => {
        await expectGet<ApiResponse>('/api/collection/by-mount/unknown', 404, {
          statusCode: 404,
          message: 'Collection is not found unknown',
        });
      });

      test('returns BAD_REQUEST on invalid mount ', async () => {
        const badMount = 'a'.repeat(50);
        await expectGet<ApiResponse>(`/api/collection/by-mount/${badMount}`, 400, {
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
        await expectGet<ApiResponse>('/api/collection/by-ids/a,1497', 400, {
          statusCode: 400,
          message: `Invalid list of ids: <string:a,1497>`,
        });
      });
    });

    describe('details-by-id', () => {
      test('returns expected result', async () => {
        await expectGet<CollectionDetails>('/api/collection/details-by-id/1497', 200, { bandIds: [], id: 1497, version: 2 });
      });

      test('returns NOT_FOUND on not found id', async () => {
        await expectGet<ApiResponse>('/api/collection/details-by-id/10000000', 404, {
          statusCode: 404,
          message: 'Collection is not found: 10000000',
        });
      });

      test('returns BAD_REQUEST on invalid id ', async () => {
        const badId = 'bad-id';
        await expectGet<ApiResponse>(`/api/collection/details-by-id/${badId}`, 400, {
          statusCode: 400,
          message: `Invalid id: <string:${badId}>`,
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

    describe('user', () => {
      test('works as expected ', async () => {
        await expectGet<GetUserCollectionsResponse>(
          `/api/collection/user/${encodeURIComponent('auth0|62fa85bf6553a51b3501ff56')}`,
          200,
          ({ collectionInfos }) => {
            expect(collectionInfos.length).toBeGreaterThanOrEqual(2);
            expect(collectionInfos.some(i => i.collection.id === userFavCollectionId)).toBe(true);
            return true;
          },
        );
      });

      test('returns NOT_FOUND on not found id', async () => {
        await expectGet<ApiResponse>(`/api/collection/user/${encodeURIComponent('auth0|11111111111111111111111')}`, 404, {
          statusCode: 404,
          message: 'User not found: auth0|11111111111111111111111',
        });
      });

      test('returns BAD_REQUEST on invalid id ', async () => {
        await expectGet<ApiResponse>(`/api/collection/user/abc`, 400, {
          message: 'Invalid user id: <string:abc>',
          statusCode: 400,
        });
      });
    });
  });

  describe('put', () => {
    describe('user', () => {
      // test('', async () => {
      //   await expectPut<UpdateCollectionRequest, UpdateCollectionResponse>(
      //     `/api/collection/user`,
      //     { id: userFavCollectionId, mount: '', name: '' },
      //     200,
      //     () => {
      //       return true;
      //     },
      //   );
      // });

      test('fails for non authenticated user', async () => {
        await expectPut<UpdateCollectionRequest, ApiResponse>(
          `/api/collection/user`,
          { id: userFavCollectionId, mount: 'new-mount', name: 'new name' },
          UNAUTHORIZED_STATUS,
          { statusCode: UNAUTHORIZED_STATUS, message: 'Request has no user data' },
        );
      });
    });
  });
});
