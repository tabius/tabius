import {Logger, Module} from '@nestjs/common';
import {join} from 'path';
import {AngularUniversalModule, applyDomino} from '@nestjs/ng-universal';

import {ServerDbModule} from './db/server-db.module';
import {UserController} from './controller/user.controller';
import {SongController} from './controller/song.controller';
import {ArtistController} from './controller/artist.controller';
import {PlaylistController} from './controller/playlist.controller';
import {ServerAuthGuard} from '@server/util/server-auth.guard';
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
    ServerAuthGuard,
    {provide: APP_INTERCEPTOR, useClass: ServerSsoService},
  ],
  controllers: [
    UserController,
    SongController,
    ArtistController,
    PlaylistController,
  ],
})
export class ServerMainModule {
}
