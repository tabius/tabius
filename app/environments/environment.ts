// noinspection HttpUrlsUsage

import {buildInfo} from '@app/environments/build';
import {TabiusEnv} from '@app/environments';

const APP_DOMAIN = 'localhost';

const backendUrl = `http://${APP_DOMAIN}:12100`;

/* Environment used for local development. */
export const environment: TabiusEnv = {
  lang: 'ru',
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
  authConfig: {
    domain: 'tabius.us.auth0.com',
    clientId: 'HsyF6TwzMaKVFhjlLdlBUJf3gs9oihFt',
    cacheLocation: 'localstorage',
    httpInterceptor: {
      allowedList: [{uri: backendUrl + '/api/*', allowAnonymous: true}]
    }
  }
};
