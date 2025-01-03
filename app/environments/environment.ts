// noinspection HttpUrlsUsage

import { buildInfo } from '@app/environments/build';
import { TabiusEnv } from '@app/environments';
import { AUTH0_COMMON_CONFIG } from '@app/environments/environment.common';

const APP_DOMAIN = 'localhost';

const backendUrl = `http://${APP_DOMAIN}:12100`;

/* Environment used for local development. */
export const environment: TabiusEnv = {
  app: 'ru',
  domain: APP_DOMAIN,
  url: `http://${APP_DOMAIN}:12101`,
  production: false,
  backendUrl,
  ssrBackendUrl: `http://${APP_DOMAIN}:12100`,
  telegramUrl: 'https://t.me/tabiusru',
  buildInfo,
  sentryConfig: {
    dsn: 'not used in dev',
  },
  auth0Config: {
    ...AUTH0_COMMON_CONFIG,
    domain: 'tabius.us.auth0.com',
    clientId: 'HsyF6TwzMaKVFhjlLdlBUJf3gs9oihFt',
    httpInterceptor: {
      allowedList: [{ uri: backendUrl + '/api/*', allowAnonymous: true }],
    },
  },
};
