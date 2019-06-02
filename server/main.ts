/**
 * Firebase depends on Protobuf & Protobuf fails with the following error
 * Error: protobufjs/src/root.js:234 throw Error("not supported");
 *
 * Reason: Protobuf incorrectly detects that it is run in 'browser mode' because of some global variables (added by domino, etc..).
 * This should be removed after Protobuf fixed their code.
 */
require('protobufjs');

import {enableProdMode} from '@angular/core';
import {NestFactory} from '@nestjs/core';
import {ServerMainModule} from './server-main.module';
import {CorsOptions} from '@nestjs/common/interfaces/external/cors-options.interface';
import * as session from 'express-session';

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
  await app.listen(4001);
}

bootstrap().catch(err => console.error(err));

const CORS_ORIGIN_WHITELIST = ['http://localhost:4201', 'http://localhost:4001', 'https://tabius.ru'];

function buildCorsOptions(): CorsOptions {
  return {
    origin: CORS_ORIGIN_WHITELIST,
    credentials: true
  };
}

