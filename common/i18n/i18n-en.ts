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
  catalogPage: {
    title: 'Catalog',
    loadingMessage: 'Loading catalog…',
    searchInputPlaceholder: 'search by name or text',
    searchInputTitle: 'Search by artist name or song text',
    clearButtonTitle: 'Reset filter',
    clear: 'Reset',
    showAllCollections: 'ALL',
    showAllCollectionsTitle: 'Show all collections',
    artistsHeader: 'Artists',
    noArtistsFound: 'No artists found',
    songsHeader: 'Songs',
    addNewArtist: 'Add',
    addNewArtistTitle: 'Add new artist or collection to the catalog',
    searchResultsPrefix: 'Search results for',
    meta: {
      title: 'Catalog: all artists and collections',
      description: 'Full list of all artists and collections on Tabius. Search songs by artist name, title and song.',
      keywords: ['tabs', 'chords', 'guitar', 'artists list', 'search song by text'],
    },
  },
  chordImage: {
    chordsLayoutTitleSuffix: ', chord layout',
  },
};
