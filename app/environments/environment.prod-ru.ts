import {buildInfo} from '@app/environments/build';
import {TabiusEnv} from '@app/environments';

const APP_DOMAIN = 'tabius.ru';

// noinspection JSUnusedGlobalSymbols
export const environment: TabiusEnv = {
  production: true,
  backendUrl: `https://${APP_DOMAIN}`,
  nodeBbUrl: `https://forum.${APP_DOMAIN}`,
  nodeBbCookieDomain: `.${APP_DOMAIN}`,
  buildInfo,
};
