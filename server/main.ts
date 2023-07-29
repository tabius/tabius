import 'core-js';
import {installLogFunctions} from '@server/util/log';
import {NestFactory} from '@nestjs/core';
import {ServerMainModule} from './server-main.module';
import {CorsOptions} from '@nestjs/common/interfaces/external/cors-options.interface';
import * as session from 'express-session';
import {SERVER_CONFIG} from '@server/server-config';
import {NestApplicationOptions} from '@nestjs/common';

installLogFunctions();

async function bootstrap(): Promise<void> {
  const nestAppOptions: NestApplicationOptions = {
    logger: false,
  };
  const nestApp = await NestFactory.create(ServerMainModule, nestAppOptions);
  nestApp.enableCors(buildCorsOptions());
  nestApp.use(session({
    secret: 'we have no secret',
    name: SERVER_CONFIG.sessionCookieName,
    resave: false,
    saveUninitialized: false,
  }));
  console.log(`Starting nest server on ${SERVER_CONFIG.serverPort} port`);
  await nestApp.listen(SERVER_CONFIG.serverPort);
}

bootstrap().catch(err => console.error(err));

function buildCorsOptions(): CorsOptions {
  return {
    origin: SERVER_CONFIG.corsOriginWhitelist,
    credentials: true
  };
}

