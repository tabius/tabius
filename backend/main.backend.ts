import 'core-js';
import { installLogFunctions } from './util/log';
import { NestFactory } from '@nestjs/core';
import { BackendModule, setApp } from './backend.module';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { SERVER_CONFIG } from './backend-config';
import { NestApplicationOptions } from '@nestjs/common';
import { registerRoutes } from '@backend/handlers/routes';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Application } from 'express';
import { join } from 'node:path';

installLogFunctions();

async function bootstrap(): Promise<void> {
  const nestAppOptions: NestApplicationOptions = {
    logger: false,
  };

  // Do not stop process on rejected promises & errors.
  process.on('unhandledRejection', (reason, promise) => {
    console.error(`Unhandled Rejection at`, promise);
    console.error(`Reason:`, reason as any);
  });

  process.on('uncaughtException', (err: Error) => {
    console.error(`Uncaught Exception thrown:`, err);
  });

  const nestApp = await NestFactory.create<NestExpressApplication>(BackendModule, nestAppOptions);
  nestApp.enableCors(buildCorsOptions());
  // Serve collection/song images from resourcesDir. In production nginx serves /images before
  // requests reach Node, so this is only used for local dev (and as a harmless fallback).
  nestApp.useStaticAssets(join(SERVER_CONFIG.resourcesDir, 'images'), { prefix: '/images' });
  setApp(nestApp);

  registerRoutes(nestApp.getHttpAdapter() as unknown as Application);

  console.log(`Starting nest server on ${SERVER_CONFIG.serverPort} port`);
  await nestApp.listen(SERVER_CONFIG.serverPort);
}

bootstrap().catch(err => console.error(err));

function buildCorsOptions(): CorsOptions {
  return {
    origin: SERVER_CONFIG.corsOriginWhitelist,
    credentials: true,
  };
}
