import { expectGet } from './utils';

describe('collection', () => {
  describe('by-mount', () => {
    test('returns expected result', async () => {
      await expectGet('/api/collection/by-mount/gran-kurazh', 200, {
        id: 1497,
        listed: true,
        mount: 'gran-kurazh',
        name: 'Гран-КуражЪ',
        type: 2,
        version: 2,
      });
    });

    test('returns NOT_FOUND on not found mount', async () => {
      await expectGet('/api/collection/by-mount/unknown', 404, { statusCode: 404, message: 'Collection is not found unknown' });
    });

    test('returns BAD_REQUEST on invalid mount ', async () => {
      const badMount = 'a'.repeat(50);
      await expectGet(`/api/collection/by-mount/${badMount}`, 400, {
        statusCode: 400,
        message: `Bad collection mount: ${badMount}`,
      });
    });
  });
});
