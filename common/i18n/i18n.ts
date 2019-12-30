import {TRANSLATIONS_MAP_RU} from './i18n-ru';
import {TRANSLATIONS_MAP_EN} from './i18n-en';
import {DeepReadonly} from '@common/typescript-extras';

export function getI18n(lang: string): DeepReadonly<I18n> {
  // Note: for the new & incomplete translations we can use deep-mere with EN.
  return lang === 'ru' ? TRANSLATIONS_MAP_RU : TRANSLATIONS_MAP_EN;
}

export interface I18n {
  common: {
    favoritesCollectionName: string,
  },
  navbar: {
    catalog: string;
    forum: string;
    logo2: string;
    noSleep: string;
    noSleepTitle: string;
    settings: string;
    studio: string;
    tuner: string;
    userIconTitle(username: string): string;
  },
  page404: {
    message: string;
  },
  addSongToCollection: {
    title: string;
    addToCollectionCheckboxTitle: (collectionName: string) => string;
    gotoCollection: string;
    gotoCollectionTitle: string;
    addToFavoritesCheckboxTitle: string;
    favorites: string;
  },
  catalogPage: {
    title: string;
    loadingMessage: string;
    searchInputPlaceholder: string;
    searchInputTitle: string;
    clearButtonTitle: string;
    clear: string;
    showAllCollections: string;
    showAllCollectionsTitle: string;
    artistsHeader: string;
    noArtistsFound: string;
    songsHeader: string;
    addNewArtist: string;
    addNewArtistTitle: string;
    searchResultsPrefix: string;
    meta: {
      title: string;
      description: string;
      keywords: string[];
    }
  },
  chordImage: {
    chordsLayoutTitleSuffix: string;
  },
  collectionBreadcrumb: {
    catalogLink: string,
    catalogLinkTitle: string,
    studioLink: string,
    studioLinkTitle: string,
  },
  footer: {
    twitterLinkTitle: string;
    githubLinkTitle: string;
    homePageLinkTitle: string;
  },
}
