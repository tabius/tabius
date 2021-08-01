import {buildInfo} from '@app/environments/build';
import {TabiusEnv} from '@app/environments';

const APP_DOMAIN = 'tabius.ru';

export const environment: TabiusEnv = {
  lang: 'ru',
  domain: APP_DOMAIN,
  url: `https://${APP_DOMAIN}`,
  production: true,
  backendUrl: `https://${APP_DOMAIN}`,
  ssrBackendUrl: 'http://localhost:4001',
  telegramUrl: 'https://t.me/tabius_ru',
  nodeBbUrl: `https://forum.${APP_DOMAIN}`,
  nodeBbChordsDiscussionTopicId: 19999,
  buildInfo,
};
