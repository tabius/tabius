import {buildInfo} from '@app/environments/build';
import {TabiusEnv} from '@app/environments';

const APP_DOMAIN = 'tabius.ru';

// noinspection JSUnusedGlobalSymbols
export const environment: TabiusEnv = {
  lang: 'ru',
  domain: APP_DOMAIN,
  url: `https://${APP_DOMAIN}`,
  production: true,
  backendUrl: `https://${APP_DOMAIN}`,
  ssrBackendUrl: 'http://localhost:4001',
  nodeBbUrl: `https://forum.${APP_DOMAIN}`,
  buildInfo,
};
