import {buildInfo} from '@app/environments/build';
import {TabiusEnv} from '@app/environments';

const APP_DOMAIN = 'localhost';

const backendUrl = `http://${APP_DOMAIN}:4001`;

export const environment: TabiusEnv = {
  lang: 'ru',
  domain: APP_DOMAIN,
  url: `http://${APP_DOMAIN}:4201`,
  production: false,
  backendUrl,
  ssrBackendUrl: `http://${APP_DOMAIN}:4001`,
  telegramUrl: 'https://t.me/tabiusru',
  buildInfo,
  sentryConfig: {
    dsn: 'not used in dev',
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
