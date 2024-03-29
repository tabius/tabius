import { Collection, CollectionDetails } from '@common/catalog-model';
import { GetHandler, RequestContext } from '@backend/handlers/handler';
import { assertTruthy, truthy } from 'assertic';
import { AsyncFreshValue } from 'frescas';
import { getApp } from '@backend/backend.module';
import { CollectionDbi } from '@backend/db/collection-dbi.service';
import { GetUserCollectionsResponse, UserCollectionInfo } from '@common/api-model';
import { NOT_FOUND, UrlParameter } from '@backend/handlers/protocol';

export const COLLECTION_RESOURCE = 'collection';

/** Returns a single collection by mount. */
export const collectionGetByMount: GetHandler<Collection> = {
  path: `${COLLECTION_RESOURCE}/by-mount/:${UrlParameter.mount}`,
  async handler({ mount, collectionDbi }: RequestContext) {
    const collection = await collectionDbi.getByMount(mount);
    return truthy(collection, () => `${NOT_FOUND}: Collection is not found ${mount}`);
  },
};

/** Returns list of collections by array of ids. */
export const collectionGetListByIds: GetHandler<Array<Collection>> = {
  path: `${COLLECTION_RESOURCE}/by-ids/:${UrlParameter.ids}`,
  async handler({ ids, collectionDbi }: RequestContext) {
    return collectionDbi.getCollectionsByIds(ids);
  },
};

/** Returns list of collections by array of ids. */
export const collectionGetDetailsById: GetHandler<CollectionDetails> = {
  path: `${COLLECTION_RESOURCE}/details-by-id/:${UrlParameter.id}`,
  async handler({ id, collectionDbi }: RequestContext) {
    const details = await collectionDbi.getCollectionDetails(id);
    return truthy(details, `${NOT_FOUND}: Collection is not found: ${id}`);
  },
};

export const allListedCollections = new AsyncFreshValue<Array<Collection>>({
  refreshPeriodMillis: 30_000,
  load: async () => {
    const collectionDbi = getApp().get(CollectionDbi);
    return collectionDbi.getAllCollections('listed-only');
  },
});

/** Returns list of all 'listed' collections. */
export const collectionGetList: GetHandler<Array<Collection>> = {
  path: `${COLLECTION_RESOURCE}/all-listed`,
  handler: () => allListedCollections.get(),
};

/** Returns list of all user collections. */
export const collectionGetListByUserId: GetHandler<GetUserCollectionsResponse> = {
  path: `${COLLECTION_RESOURCE}/user/:${UrlParameter.userId}`,
  handler: async ({ userIdParam, collectionDbi, songDbi }) => {
    const collections = await collectionDbi.getAllUserCollections(userIdParam);
    // Every user has at least one collection: primary (or favorite).
    assertTruthy(collections.length > 0, () => `${NOT_FOUND}: User not found: ${userIdParam}`);
    const songIds: number[][] = await Promise.all(
      collections.map(collection => songDbi.getPrimaryAndSecondarySongIdsByCollectionId(collection.id)),
    );
    const collectionInfos = collections.map<UserCollectionInfo>((collection, index) => ({ collection, songIds: songIds[index] }));
    return { collectionInfos };
  },
};
