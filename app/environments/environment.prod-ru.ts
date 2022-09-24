import {buildInfo} from '@app/environments/build';
import {TabiusEnv} from '@app/environments';

const APP_DOMAIN = 'tabius.ru';

const backendUrl = `https://${APP_DOMAIN}`;

export const environment: TabiusEnv = {
  lang: 'ru',
  domain: APP_DOMAIN,
  url: `https://${APP_DOMAIN}`,
  production: true,
  backendUrl: `https://${APP_DOMAIN}`,
  ssrBackendUrl: 'http://localhost:4001',
  telegramUrl: 'https://t.me/tabiusru',
  buildInfo,
  sentryConfig: {
    dsn: 'https://fc6fba35084549b6a9fdf8843dc74887@o1134925.ingest.sentry.io/6755287',
  },
  authConfig: {
    domain: 'tabius.us.auth0.com',
    clientId: 'HsyF6TwzMaKVFhjlLdlBUJf3gs9oihFt',
    cacheLocation: 'localstorage',
    audience: 'web-client-api-id',
    httpInterceptor: {
      allowedList: [
        {
          uri: backendUrl + '/api/*',
          allowAnonymous: true,
          tokenOptions: {
            /** The attached token should target this audience. */
            audience: 'web-client-api-id',
            /** The attached token should have these scopes. */
            scope: 'read:current_user'
          }
        }
      ]
    }
  }
};
