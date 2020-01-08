import {TRANSLATIONS_MAP_RU} from './i18n-ru';
import {TRANSLATIONS_MAP_EN} from './i18n-en';
import {DeepReadonly} from '@common/typescript-extras';
import {CollectionType} from '@common/catalog-model';

export function getI18n(lang: string): DeepReadonly<I18n> {
  // Note: for the new & incomplete translations we can use deep-mere with EN.
  return lang === 'ru' ? TRANSLATIONS_MAP_RU : TRANSLATIONS_MAP_EN;
}

export interface I18n {
  common: {
    favoritesCollectionName: string;
    error: (message: string) => string;
  };
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
  };
  page404: {
    message: string;
  };
  addSongToCollection: {
    title: string;
    addToCollectionCheckboxTitle: (collectionName: string) => string;
    gotoCollection: string;
    gotoCollectionTitle: string;
    addToFavoritesCheckboxTitle: string;
    favorites: string;
  };
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
  };
  chordImage: {
    chordsLayoutTitleSuffix: string;
  };
  collectionBreadcrumb: {
    catalogLink: string,
    catalogLinkTitle: string,
    studioLink: string,
    studioLinkTitle: string,
  };
  footer: {
    twitterLinkTitle: string;
    githubLinkTitle: string;
    homePageLinkTitle: string;
  };
  collectionEditor: {
    header: string;
    collectionName: string;
    collectionMount: string;
    collectionType: string;
    person: string;
    band: string;
    compilation: string;
    create: string;
    close: string;
  };
  collectionPage: {
    collectionNotFound: string;
    loadingSongList: string;
    addSong: string;
    collectionsSettings: string;
    supportLink: string;
    supportLinkTitle: string;
    meta: {
      title: (name: string, type: CollectionType) => string;
      description: (name: string, firstSongs: string) => string;
      keywords: (name: string) => string[];
    }
  };
  shortcuts: {
    title: string;
    prevSong: string;
    nextSong: string;
    showHelp: string;
    saveSong: string;
    collectionPage: {
      addSong: string;

    };
    songPage: {
      transposeUp: string;
      transposeDown: string;
      resetTranspose: string;
      editSong: string;
    };
    close: string;
  };
  moderatorPrompt: {
    youAreNotModerator: string;
    but: string;
    howToBecomeModeratorHtml: string;
    forumLink: string;
  };
  resourceNotFoundComponent: {
    tryToReloadPagePrompt;
  };
  settingsPage: {
    pageHeader: string;
    loadingText: string;
    songRenderingSettingsHeader: string;
    fontSize: string;
    h4Si: string;
    example: string;
    notSignedInPrompt: {
      register: string;
      or: string;
      signIn: string;
      toGetAccess: string;
    },
    demoSongText: string;
  };
  signinSignoutButton: {
    signIn: string;
    signOut: string;
  };
  homePage: {
    titleLevel2: string;
    newsLink: string;
    catalogLink: string;
    studioLink: string;
    interestingFacts: string;
    worksWithNoInternetFact: string;
    noAdsFact: string
    openSourceFact: {
      tabiusSourceCode: string;
      isOpenOnGithub: string;
      useAndImprove: string;
    };
    forMusicLoversFact: string;
  };
}
