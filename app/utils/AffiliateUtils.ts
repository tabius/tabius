import { md5 } from 'pure-md5';
import { I18N } from '@app/app-i18n';
import { environment } from '@app/environments/environment';

export const HAS_AFFILIATE_SUPPORT = environment.app === 'org';

export function buildAffiliateLink(artistName: string): string {
  const searchString = `${artistName} ${I18N.common.affiliateSearchSuffix}`;
  const linkId = md5(searchString);
  return `https://www.amazon.com/gp/search?ie=UTF8&tag=bigapple0b-20&linkCode=ur2&linkId=${linkId}&camp=1789&creative=9325&index=aps&keywords=${searchString}`;
}
