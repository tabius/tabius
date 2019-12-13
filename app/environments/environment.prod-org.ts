import {buildInfo} from '@app/environments/build';
import {TabiusEnv} from '@app/environments';

const APP_DOMAIN = 'tabius.org';

// noinspection JSUnusedGlobalSymbols
export const environment: TabiusEnv = {
  production: true,
  backendUrl: `https://${APP_DOMAIN}`,
  ssrBackendUrl: 'http://localhost:24001',
  nodeBbUrl: `https://forum.${APP_DOMAIN}`,
  buildInfo,
};
