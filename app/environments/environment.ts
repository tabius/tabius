import {buildInfo} from '@app/environments/build';
import {TabiusEnv} from '@app/environments';

const APP_DOMAIN = 'localhost';

export const environment: TabiusEnv = {
  lang: 'ru',
  domain: APP_DOMAIN,
  production: false,
  backendUrl: `http://${APP_DOMAIN}:4001`,
  ssrBackendUrl: `http://${APP_DOMAIN}:4001`,
  nodeBbUrl: `http://${APP_DOMAIN}:4002`,
  buildInfo,
};
