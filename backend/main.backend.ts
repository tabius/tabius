import 'core-js';
import { installLogFunctions } from './util/log';
import { NestFactory } from '@nestjs/core';
import { BackendModule, setApp } from './backend.module';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { SERVER_CONFIG } from './backend-config';
import { NestApplicationOptions } from '@nestjs/common';
import { registerRoutes } from '@backend/handlers/routes';
import { Application } from 'express';

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

  const nestApp = await NestFactory.create(BackendModule, nestAppOptions);
  nestApp.enableCors(buildCorsOptions());
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
