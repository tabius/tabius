import { buildInfo } from '@app/environments/build';
import { TabiusEnv } from '@app/environments';
import { AUTH0_COMMON_CONFIG } from '@app/environments/environment.common';

const APP_DOMAIN = 'tabius.org';

const backendUrl = `https://${APP_DOMAIN}`;

export const environment: TabiusEnv = {
  app: 'org',
  domain: APP_DOMAIN,
  url: `https://${APP_DOMAIN}`,
  production: true,
  backendUrl: `https://${APP_DOMAIN}`,
  ssrBackendUrl: 'http://localhost:13100',
  telegramUrl: 'https://t.me/tabiusru', // TODO:
  buildInfo,
  sentryConfig: {
    dsn: 'https://6e23de37b4bb4374a82883f40d1e11e9@o1134925.ingest.sentry.io/6773547',
  },
  auth0Config: {
    ...AUTH0_COMMON_CONFIG,
    domain: 'tabius-org.us.auth0.com',
    clientId: 'elgYidwkWEROavQBMADZdDUKQCtoVIYC',
    httpInterceptor: {
      allowedList: [{ uri: `${backendUrl}/api/*`, allowAnonymous: true }],
    },
  },
};
