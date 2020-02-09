import {Logger, Module} from '@nestjs/common';
import {join} from 'path';
import {AngularUniversalModule} from '@nestjs/ng-universal';
import * as domino from 'domino';

import {ServerDbModule} from './db/server-db.module';
import {UserController} from './controller/user.controller';
import {SongController} from './controller/song.controller';
import {CollectionController} from './controller/collection.controller';
import {APP_INTERCEPTOR} from '@nestjs/core';
import {ServerSsoService} from '@server/service/server-sso.service';

applyDomino();

@Module({
  imports: [
    AngularUniversalModule.forRoot({
      viewsPath: join(process.cwd(), 'dist/browser'),
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


function applyDomino(): void {
  const win = domino.createWindow('<body></body>');

  global['window'] = win;
  Object.defineProperty(
      win.document.body.style,
      'transform',
      {
        value: () => ({
          enumerable: true,
          configurable: true,
        })
      },
  );
  global['document'] = win.document;
  global['navigator'] = win.navigator;
  global['CSS'] = null;
  global['Prism'] = null;
}

