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
  nodeBbUrl: `https://forum.${APP_DOMAIN}`,
  nodeBbChordsDiscussionTopicId: 2,
  buildInfo,
};
