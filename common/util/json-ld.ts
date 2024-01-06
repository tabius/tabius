import { Collection, Song } from '@common/catalog-model';
import { BreadcrumbList, WithContext } from 'schema-dts';
import { getCollectionPageLink, getSongPageLink } from '@common/util/misc-utils';
import { LINK_CATALOG } from '@common/mounts';
import { I18N } from '@app/app-i18n';
import { getFullLink } from '@app/utils/url-utils';

export function getSongJsonLdBreadcrumbList(activeCollection: Collection, song: Song, primaryCollection: Collection|undefined): WithContext<BreadcrumbList> {
  const catalogUrl = getFullLink(LINK_CATALOG);
  const collectionUrl = getFullLink(getCollectionPageLink(activeCollection));
  const songUrl = getFullLink(getSongPageLink(activeCollection.mount, song.mount, primaryCollection?.mount));
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        'position': 1,
        'item': {
          '@type': 'WebPage',
          '@id': catalogUrl,
          'name': I18N.common.catalog,
          'url': catalogUrl,
        },
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'item': {
          '@type': 'WebPage',
          '@id': collectionUrl,
          'name': activeCollection.name,
          'url': collectionUrl,
        },
      },
      {
        '@type': 'ListItem',
        'position': 3,
        'item': {
          '@type': 'WebPage',
          '@id': songUrl,
          'name': song.title,
          'url': songUrl,
        },
      },
    ],
  };
}
