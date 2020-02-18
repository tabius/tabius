import {NestFactory} from '@nestjs/core';
import {ServerMainModule} from './server-main.module';
import {CorsOptions} from '@nestjs/common/interfaces/external/cors-options.interface';
import * as session from 'express-session';
import * as cookieParser from 'cookie-parser';
import {SERVER_CONFIG} from '@server/server-config';

async function bootstrap() {
  const app = await NestFactory.create(ServerMainModule);
  app.enableCors(buildCorsOptions());
  app.use(cookieParser());
  app.use(session({
    secret: 'we have no secret',
    name: SERVER_CONFIG.sessionCookieName,
    resave: false,
    saveUninitialized: true
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

