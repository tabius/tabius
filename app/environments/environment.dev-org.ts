// noinspection HttpUrlsUsage

import { buildInfo } from '@app/environments/build';
import { TabiusEnv } from '@app/environments';
import { AUTH0_COMMON_CONFIG } from '@app/environments/environment.common';

const APP_DOMAIN = 'localhost';

const backendUrl = `http://${APP_DOMAIN}:13100`;

/* Environment used for local development. */
export const environment: TabiusEnv = {
  app: 'org',
  domain: APP_DOMAIN,
  url: `http://${APP_DOMAIN}:13101`,
  production: false,
  backendUrl,
  ssrBackendUrl: `http://${APP_DOMAIN}:13100`,
  telegramUrl: 'https://t.me/tabiusru',
  buildInfo,
  sentryConfig: {
    dsn: 'not used in dev',
  },
  auth0Config: {
    ...AUTH0_COMMON_CONFIG,
    domain: 'tabius-org.us.auth0.com',
    clientId: 'elgYidwkWEROavQBMADZdDUKQCtoVIYC',
    cacheLocation: 'localstorage',
    httpInterceptor: {
      allowedList: [{ uri: `${backendUrl}/api/*`, allowAnonymous: true }],
    },
  },
};
