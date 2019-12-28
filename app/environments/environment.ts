import {buildInfo} from '@app/environments/build';
import {TabiusEnv} from '@app/environments';

const APP_DOMAIN = 'localhost';

/** Default development environment. */
export const environment: TabiusEnv = {
  domain: APP_DOMAIN,
  production: false,
  backendUrl: `http://${APP_DOMAIN}:4001`,
  ssrBackendUrl: `http://${APP_DOMAIN}:4001`,
  nodeBbUrl: `http://${APP_DOMAIN}:4002`,
  buildInfo,
};
