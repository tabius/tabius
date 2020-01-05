import {buildInfo} from '@app/environments/build';
import {TabiusEnv} from '@app/environments';

const APP_DOMAIN = 'localhost';

export const environment: TabiusEnv = {
  lang: 'ru',
  domain: APP_DOMAIN,
  url: `http://${APP_DOMAIN}:4201`,
  production: false,
  backendUrl: `http://${APP_DOMAIN}:4001`,
  ssrBackendUrl: `http://${APP_DOMAIN}:4001`,
  nodeBbUrl: `https://forum.tabius.ru`,
  nodeBbChordsDiscussionTopicId: 19999,
  buildInfo,
};
