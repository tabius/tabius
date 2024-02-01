import { GetHandler, mountGet } from '@backend/handlers/handler';
import { Application } from 'express';
import { collectionGetByMount } from '@backend/handlers/collection.handler';

export function   registerRoutes(app: Application): void {
  // Shortcuts.
  const get = (getHandler: GetHandler<any>): void => mountGet(app, getHandler);

  // const post = <Req, Res>(postHandler: PostHandler<Req, Res>): void => mountPost(app, postHandler);

  console.log('registerRoutes: STARTED');
  get(collectionGetByMount);

  console.log('registerRoutes: DONE');
}
