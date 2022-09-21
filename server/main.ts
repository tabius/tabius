import {installLogFunctions} from '@server/util/log';
import {NestFactory} from '@nestjs/core';
import {ServerMainModule} from './server-main.module';
import {CorsOptions} from '@nestjs/common/interfaces/external/cors-options.interface';
import * as session from 'express-session';
import {SERVER_CONFIG} from '@server/server-config';

installLogFunctions();

async function bootstrap() {
  const app = await NestFactory.create(ServerMainModule);
  app.enableCors(buildCorsOptions());
  app.use(session({
    secret: 'we have no secret',
    name: SERVER_CONFIG.sessionCookieName,
    resave: false,
    saveUninitialized: false,
  }));
  await app.listen(SERVER_CONFIG.serverPort);
}

bootstrap().catch(err => console.error(err));

function buildCorsOptions(): CorsOptions {
  return {
    origin: SERVER_CONFIG.corsOriginWhitelist,
    credentials: true
  };
}

