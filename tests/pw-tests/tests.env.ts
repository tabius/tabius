import {I18N} from '@app/app-i18n';
import {I18n} from '@common/i18n/i18n';
import {DeepReadonly} from '@common/typescript-extras';


export const TEST_ENV: PlaywrightTestEnvironment = {
  rootUrl: 'http://localhost:12102',
  i18n: I18N,
  collections: [
    {
      id: 1531,
      mount: 'iowa',
      name: 'IOWA',
      songs: [{id: 92445, mount: 'bet-bit', name: 'Бьет бит'}],
    }],
};

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
  songs: [{
    id: number,
    mount: string,
    name: string;
  }];
}
