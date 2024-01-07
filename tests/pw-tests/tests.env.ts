import { getI18n, I18n } from '@common/i18n/i18n';
import { DeepReadonly } from '@common/typescript-extras';

interface PlaywrightTestEnvironment {
  rootUrl: string;
  i18n: DeepReadonly<I18n>;
  /** Some collections used in tests. */
  collections: Array<TestCollectionData>;
}

interface TestCollectionData {
  id: number;
  mount: string;
  name: string;
  songs: [
    {
      id: number;
      mount: string;
      name: string;
    },
  ];
}

const TEST_ENV_DEV_RU: PlaywrightTestEnvironment = {
  rootUrl: 'http://localhost:12102',
  i18n: getI18n('ru'),
  collections: [
    {
      id: 1531,
      mount: 'iowa',
      name: 'IOWA',
      songs: [{ id: 92445, mount: 'bet-bit', name: 'Бьет бит' }],
    },
  ],
};

const TEST_ENV_PROD_RU: PlaywrightTestEnvironment = { ...TEST_ENV_DEV_RU, rootUrl: 'https://tabius.ru' };

const TEST_ENV_DEV_EN: PlaywrightTestEnvironment = {
  rootUrl: 'http://localhost:13102',
  i18n: getI18n('org'),
  collections: [
    {
      id: 4,
      mount: 'abba',
      name: 'ABBA',
      songs: [{ id: 60, mount: 'andante-andante', name: 'Andante Andante' }],
    },
  ],
};

const TEST_ENV_PROD_ORG: PlaywrightTestEnvironment = { ...TEST_ENV_DEV_RU, rootUrl: 'https://tabius.org' };

let selectedTestEnv: PlaywrightTestEnvironment;
switch (process.env['TEST_ENV']) {
  case 'org':
    selectedTestEnv = TEST_ENV_PROD_ORG;
    break;
  case 'ru':
    selectedTestEnv = TEST_ENV_PROD_RU;
    break;
  case 'dev-org':
    selectedTestEnv = TEST_ENV_DEV_EN;
    break;
  case 'dev-ru':
  default:
    selectedTestEnv = TEST_ENV_DEV_RU;
    break;
}

export const TEST_ENV = selectedTestEnv;
