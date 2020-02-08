import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {AppModule} from '@app/app.module';
import {enableProdMode} from '@angular/core';
import {environment} from '@app/environments/environment';

if (environment.production) {
  enableProdMode();
}

document.addEventListener('DOMContentLoaded', () => {
      platformBrowserDynamic().bootstrapModule(AppModule)
          .catch(err => console.error(err));
    },
    {passive: true}
);

