import {Logger, Module} from '@nestjs/common';
import {join} from 'path';
import {AngularUniversalModule, applyDomino} from '@nestjs/ng-universal';

import {ServerDbModule} from './db/server-db.module';
import {UserController} from './controller/user.controller';
import {SongController} from './controller/song.controller';
import {CollectionController} from './controller/collection.controller';
import {APP_INTERCEPTOR} from '@nestjs/core';
import {ServerSsoService} from '@server/service/server-sso.service';

const BROWSER_DIR = join(process.cwd(), 'dist/browser');
applyDomino(global, join(BROWSER_DIR, 'index.html'));

@Module({
  imports: [
    AngularUniversalModule.forRoot({
      viewsPath: BROWSER_DIR,
      bundle: require('./../dist/server/main.js'),
    }),
    ServerDbModule,
  ],
  providers: [
    Logger,
    {provide: APP_INTERCEPTOR, useClass: ServerSsoService},
  ],
  controllers: [
    UserController,
    SongController,
    CollectionController,
  ],
})
export class ServerMainModule {
}
