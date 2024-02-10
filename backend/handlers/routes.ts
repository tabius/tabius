import { GetHandler, mountGet } from '@backend/handlers/handler';
import { Application } from 'express';
import { collectionGetByMount, collectionGetDetailsById, collectionGetList, collectionGetListByIds } from '@backend/handlers/collection.handler';

export function registerRoutes(app: Application): void {
  // Shortcuts.
  const get = (getHandler: GetHandler<any>): void => mountGet(app, getHandler);

  // const post = <Req, Res>(postHandler: PostHandler<Req, Res>): void => mountPost(app, postHandler);

  console.log('registerRoutes: STARTED');
  get(collectionGetByMount);
  get(collectionGetDetailsById);
  get(collectionGetList);
  get(collectionGetListByIds);

  console.log('registerRoutes: DONE');
}
