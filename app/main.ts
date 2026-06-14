import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from '@app/app.module';
import { enableProdMode } from '@angular/core';
import { environment } from '@app/environments/environment';
import * as Sentry from '@sentry/angular';

if (environment.production) {
  Sentry.init({
    dsn: environment.sentryConfig.dsn,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.2,
  });

  enableProdMode();
}

document.addEventListener(
  'DOMContentLoaded',
  () => {
    platformBrowserDynamic()
      .bootstrapModule(AppModule)
      .catch(err => console.error(err));
  },
  { passive: true },
);
