import 'core-js';
import { installLogFunctions } from './util/log';
import { NestFactory } from '@nestjs/core';
import { BackendModule } from './backend.module';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { SERVER_CONFIG } from './backend-config';
import { NestApplicationOptions } from '@nestjs/common';

installLogFunctions();

async function bootstrap(): Promise<void> {
  const nestAppOptions: NestApplicationOptions = {
    logger: false,
  };
  const nestApp = await NestFactory.create(BackendModule, nestAppOptions);
  nestApp.enableCors(buildCorsOptions());
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
