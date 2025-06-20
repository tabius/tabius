import { APP_INTERCEPTOR } from '@nestjs/core';
import { INestApplication, Logger, Module } from '@nestjs/common';
import { ServerDbModule } from './db/server-db.module';
import { UserController } from './controller/user.controller';
import { SongController } from './controller/song.controller';
import { CollectionController } from './controller/collection.controller';
import { BackendAuthService } from './service/backend-auth.service';
import { truthy } from 'assertic';
import { TelegramService } from '@backend/service/telegram.service';

@Module({
  imports: [ServerDbModule],
  providers: [Logger, { provide: APP_INTERCEPTOR, useClass: BackendAuthService }, TelegramService],
  controllers: [CollectionController, SongController, UserController],
})
export class BackendModule {
  // noinspection JSUnusedGlobalSymbols
  constructor(readonly telegramService: TelegramService) {}
}

let nestApp: INestApplication | undefined;

export function setApp(app: INestApplication): void {
  nestApp = app;
}

export function getApp(): INestApplication {
  return truthy(nestApp, 'Nest app was not set');
}
