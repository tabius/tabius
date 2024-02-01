import { Collection } from '@common/catalog-model';
import { BAD_REQUEST, GetHandler, NOT_FOUND, RequestContext, UrlParameter } from '@backend/handlers/handler';
import { isCollectionMount } from '@backend/util/validators';
import { getApp } from '@backend/backend.module';
import { CollectionDbi } from '@backend/db/collection-dbi.service';

// TODO: add api prefix
export const COLLECTION_RESOURCE = 'collections';

export const collectionGetByMount: GetHandler<Collection> = {
  path: `${COLLECTION_RESOURCE}/:${UrlParameter.mount}`,
  async handler({ mount }: RequestContext) {
    if (!isCollectionMount(mount)) {
      // TODO: validate before calling the handler.
      throw new Error(`${BAD_REQUEST}: Bad collection mount: ${mount}`);
    }
    const collectionDbi = getApp().get(CollectionDbi);
    const collection = await collectionDbi.getByMount(mount);
    if (!collection) {
      throw new Error(`${NOT_FOUND} Collection is not found ${mount}`);
    }
    return collection;
  },
};
