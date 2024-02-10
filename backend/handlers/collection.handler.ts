import { Collection, CollectionDetails } from '@common/catalog-model';
import { GetHandler, NOT_FOUND, RequestContext, UrlParameter } from '@backend/handlers/handler';
import { truthy } from 'assertic';
import { AsyncFreshValue } from 'frescas';
import { getApp } from '@backend/backend.module';
import { CollectionDbi } from '@backend/db/collection-dbi.service';

export const COLLECTION_RESOURCE = 'collection';

/** Returns a single collection by mount. */
export const collectionGetByMount: GetHandler<Collection> = {
  path: `${COLLECTION_RESOURCE}/by-mount/:${UrlParameter.mount}`,
  async handler({ mount, collectionDbi }: RequestContext) {
    const collection = await collectionDbi.getByMount(mount);
    return truthy(collection, () => `${NOT_FOUND} Collection is not found ${mount}`);
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
  refreshPeriodMillis: 30 * 1000,
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
