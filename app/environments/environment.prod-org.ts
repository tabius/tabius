import {buildInfo} from '@app/environments/build';
import {TabiusEnv} from '@app/environments';

const APP_DOMAIN = 'tabius.org';

const backendUrl = `https://${APP_DOMAIN}`;

export const environment: TabiusEnv = {
  lang: 'en',
  domain: APP_DOMAIN,
  url: `https://${APP_DOMAIN}`,
  production: true,
  backendUrl: `https://${APP_DOMAIN}`,
  ssrBackendUrl: 'http://localhost:24001',
  telegramUrl: 'https://t.me/tabiusru', // TODO:
  buildInfo,
  authConfig: {
    domain: 'tabius-org.us.auth0.com',
    clientId: 'elgYidwkWEROavQBMADZdDUKQCtoVIYC',
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
