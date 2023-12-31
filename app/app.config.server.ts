import {ApplicationConfig, importProvidersFrom, mergeApplicationConfig} from '@angular/core';
import {provideServerRendering} from '@angular/platform-server';
import {appConfig} from '@app/app.config';
import {AppModule} from '@app/app.module';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    importProvidersFrom(AppModule),
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
