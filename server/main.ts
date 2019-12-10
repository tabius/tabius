import {enableProdMode} from '@angular/core';
import {NestFactory} from '@nestjs/core';
import {ServerMainModule} from './server-main.module';
import {CorsOptions} from '@nestjs/common/interfaces/external/cors-options.interface';
import * as session from 'express-session';
import {getServerPort} from '@server/util/server-config-utils';
import {environment} from '@app/environments/environment';

const cookieParser = require('cookie-parser');

enableProdMode();

// @ts-ignore
global.XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

async function bootstrap() {
  const app = await NestFactory.create(ServerMainModule);
  app.enableCors(buildCorsOptions());
  app.use(cookieParser());
  app.use(session({
    secret: 'we have no secret',
    name: 'tabius.sid',
    resave: false,
    saveUninitialized: true
  }));
  await app.listen(getServerPort());
}

bootstrap().catch(err => console.error(err));

const CORS_ORIGIN_WHITELIST = ['http://localhost:4201', environment.backendUrl];

function buildCorsOptions(): CorsOptions {
  return {
    origin: CORS_ORIGIN_WHITELIST,
    credentials: true
  };
}

