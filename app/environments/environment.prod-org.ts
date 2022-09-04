import {buildInfo} from '@app/environments/build';
import {TabiusEnv} from '@app/environments';

const APP_DOMAIN = 'tabius.org';

export const environment: TabiusEnv = {
  lang: 'en',
  domain: APP_DOMAIN,
  url: `https://${APP_DOMAIN}`,
  production: true,
  backendUrl: `https://${APP_DOMAIN}`,
  ssrBackendUrl: 'http://localhost:24001',
  telegramUrl: 'https://t.me/tabius_ru',
  buildInfo,
  authConfig: {
    // TODO:
    'domain': 'tabius-org.us.auth0.com',
    'clientId': 'HsyF6TwzMaKVFhjlLdlBUJf3gs9oihFt',
  }
};
