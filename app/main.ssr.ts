import {enableProdMode} from '@angular/core';
import {environment} from '@app/environments/environment';

if (environment.production) {
  enableProdMode();
}

export {ngExpressEngine} from '@nguniversal/express-engine';
export {provideModuleMap} from '@nguniversal/module-map-ngfactory-loader';
export {AppServerModule} from './app.ssr.module';
