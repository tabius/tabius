import {APP_INTERCEPTOR} from '@nestjs/core';
import {Logger, Module} from '@nestjs/common';
import {ServerDbModule} from '@server/db/server-db.module';
import {UserController} from '@server/controller/user.controller';
import {SongController} from '@server/controller/song.controller';
import {CollectionController} from '@server/controller/collection.controller';
import {ServerSsoService} from '@server/service/server-sso.service';

@Module({
  imports: [
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
