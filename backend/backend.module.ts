import { APP_INTERCEPTOR } from '@nestjs/core';
import { Logger, Module } from '@nestjs/common';
import { ServerDbModule } from './db/server-db.module';
import { UserController } from './controller/user.controller';
import { SongController } from './controller/song.controller';
import { CollectionController } from './controller/collection.controller';
import { BackendAuthService } from './service/backend-auth.service';

@Module({
  imports: [ServerDbModule],
  providers: [Logger, { provide: APP_INTERCEPTOR, useClass: BackendAuthService }],
  controllers: [CollectionController, SongController, UserController],
})
export class BackendModule {}
