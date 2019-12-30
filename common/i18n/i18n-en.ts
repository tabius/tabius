import {I18n} from '@common/i18n/i18n';

const FAVORITES_COLLECTION_NAME = 'Favorites';

export const TRANSLATIONS_MAP_EN: I18n = {
  common: {
    favoritesCollectionName: FAVORITES_COLLECTION_NAME,
  },
  navbar: {
    catalog: 'CATALOG',
    forum: 'FORUM',
    logo2: 'chords & tabs',
    noSleep: 'NO SLEEP',
    noSleepTitle: 'Keep mobile phone screen always on',
    settings: 'SETTINGS',
    studio: 'STUDIO',
    tuner: 'TUNER',
    userIconTitle: (username: string) => `Account: ${username}`,
  },
  page404: {
    message: 'Page not found!',
  },
  addSongToCollection: {
    title: 'Add to collection:',
    addToCollectionCheckboxTitle: (collectionName) => `Add song to «${collectionName}»`,
    gotoCollection: 'open »',
    gotoCollectionTitle: 'Open collection page',
    addToFavoritesCheckboxTitle: 'Add song to Favorites',
    favorites: FAVORITES_COLLECTION_NAME,
  },
};
