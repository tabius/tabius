import {Logger, Module} from '@nestjs/common';
import {join} from 'path';
import {AngularUniversalModule, applyDomino} from '@nestjs/ng-universal';

import {ServerDbModule} from './db/server-db.module';
import {UserController} from './controller/user.controller';
import {SongController} from './controller/song.controller';
import {ArtistController} from './controller/artist.controller';
import {PlaylistController} from './controller/playlist.controller';
import {AuthAdminService} from './service/auth-admin.service';
import {ServerAuthGuard} from '@server/util/server-auth.guard';

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
    AuthAdminService,
    ServerAuthGuard
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
