import { Collection } from '@common/catalog-model';
import { GetHandler, NOT_FOUND, RequestContext, UrlParameter } from '@backend/handlers/handler';
import { truthy } from 'assertic';

export const COLLECTION_RESOURCE = 'collection';

export const collectionGetByMount: GetHandler<Collection> = {
  path: `${COLLECTION_RESOURCE}/by-mount/:${UrlParameter.mount}`,
  async handler({ mount, collectionDbi }: RequestContext) {
    const collection = await collectionDbi.getByMount(mount);
    return truthy(collection, () => `${NOT_FOUND} Collection is not found ${mount}`);
  },
};

export const collectionGetListByIds: GetHandler<Array<Collection>> = {
  path: `${COLLECTION_RESOURCE}/by-ids/:${UrlParameter.ids}`,
  async handler({ ids, collectionDbi }: RequestContext) {
    return collectionDbi.getCollectionsByIds(ids);
  },
};
