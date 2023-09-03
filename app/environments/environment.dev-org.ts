// noinspection HttpUrlsUsage

import {buildInfo} from '@app/environments/build';
import {TabiusEnv} from '@app/environments';

const APP_DOMAIN = 'localhost';

const backendUrl = `http://${APP_DOMAIN}:13100`;

/* Environment used for local development. */
export const environment: TabiusEnv = {
  lang: 'en',
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
  authConfig: {
    domain: 'tabius-org.us.auth0.com',
    clientId: 'elgYidwkWEROavQBMADZdDUKQCtoVIYC',
    cacheLocation: 'localstorage',
    httpInterceptor: {
      allowedList: [{uri: `${backendUrl}/api/*`, allowAnonymous: true}]
    }
  }
};
