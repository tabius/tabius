import {APP_INTERCEPTOR} from '@nestjs/core';
import {Logger, Module} from '@nestjs/common';
import {ServerDbModule} from '@server/db/server-db.module';
import {UserController} from '@server/controller/user.controller';
import {SongController} from '@server/controller/song.controller';
import {CollectionController} from '@server/controller/collection.controller';
import {ServerAuthService} from '@server/service/server-auth.service';

@Module({
  imports: [
    ServerDbModule,
  ],
  providers: [
    Logger,
    {provide: APP_INTERCEPTOR, useClass: ServerAuthService},
  ],
  controllers: [
    UserController,
    SongController,
    CollectionController,
  ],
})
export class ServerMainModule {
}
