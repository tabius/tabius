import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {AppModule} from '@app/app.module';
import {enableProdMode} from '@angular/core';
import {environment} from '@app/environments/environment';
import * as Sentry from '@sentry/angular';

if (environment.production) {
  Sentry.init({
    dsn: 'https://fc6fba35084549b6a9fdf8843dc74887@o1134925.ingest.sentry.io/6755287',
    integrations: [
      // new BrowserTracing({
      //   tracingOrigins: ['localhost', 'https://tabius.ru/api'],
      //   routingInstrumentation: Sentry.routingInstrumentation,
      // }),
    ],
    tracesSampleRate: 0,
    sendClientReports: false,
  });

  enableProdMode();
}

document.addEventListener('DOMContentLoaded', () => {
      platformBrowserDynamic().bootstrapModule(AppModule)
          .catch(err => console.error(err));
    },
    {passive: true}
);

