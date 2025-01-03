import { buildInfo } from '@app/environments/build';
import { TabiusEnv } from '@app/environments';
import { AUTH0_COMMON_CONFIG } from '@app/environments/environment.common';

const APP_DOMAIN = 'tabius.ru';

const backendUrl = `https://${APP_DOMAIN}`;

export const environment: TabiusEnv = {
  app: 'ru',
  domain: APP_DOMAIN,
  url: `https://${APP_DOMAIN}`,
  production: true,
  backendUrl: `https://${APP_DOMAIN}`,
  ssrBackendUrl: 'http://localhost:12100',
  telegramUrl: 'https://t.me/tabiusru',
  buildInfo,
  sentryConfig: {
    dsn: 'https://fc6fba35084549b6a9fdf8843dc74887@o1134925.ingest.sentry.io/6755287',
  },
  auth0Config: {
    ...AUTH0_COMMON_CONFIG,
    domain: 'tabius.us.auth0.com',
    clientId: 'HsyF6TwzMaKVFhjlLdlBUJf3gs9oihFt',
    httpInterceptor: {
      allowedList: [{ uri: `${backendUrl}/api/*`, allowAnonymous: true }],
    },
  },
};
