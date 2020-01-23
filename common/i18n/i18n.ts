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
      description: (firstSongs: string) => string;
      keywords: (name: string) => string[];
    }
  };
  shortcuts: {
    title: string;
    prevSong: string;
    nextSong: string;
    showHelp: string;
    saveSong: string;
    gotoRandomSongInCollection: string;
    gotoRandomSongInCatalog: string;
    twice: string;
    left: string;
    right: string;
    collectionPage: {
      addSong: string;

    };
    songPage: {
      transposeUp: string;
      transposeDown: string;
      resetTranspose: string;
      editSong: string;
      scrollToSongStart: string;
      scrollPageUp: string;
      scrollPageDown: string;
    };
    close: string;
  };
  moderatorPrompt: {
    youAreNotModerator: string;
    but: string;
    butLine1: string;
    butLine2: string;
    butForum: string;
    also: string;
    alsoLine1: string;
    alsoLine2: string;
    alsoStudio: string;
    close: string;
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
  chordPopover: {
    discussionLink: string;
    discussionLinkTitle: string;
    tabiusHasNoChordLayout: string;
    forumLink: {
      title: string;
      prefix: string;
      link: string;
      suffix: string;
    };
  };
  songComponent: {
    loadingMessage: string;
  };
  songChordsComponent: {
    chordsTitle: string;
    transposeUp: string;
    transposeDown: string;
    originalKey: string;
  };
  songEditorComponent: {
    loadingMessage: string;
    titlePlaceholder: string;
    mountPlaceholder: string;
    textPlaceholder: string;
    youtubeLinkPlaceholder: string;
    create: string;
    update: string;
    cancel: string;
    delete: string;
    deleteConfirmationTitle: string;
    deleteTitle: string;
    deleteRequiresConfirmationTitle: string;
    toasts: {
      songTitleIsRequired: string;
      songTextIsRequired: string;
      failedToCreateSongPrefix: string;
      saved: string;
      failedToSavePrefix: string;
      deleteConfirmationIsRequired: string;
      failedToDeleteSong: string;
      songWasDeleted: string;
    };
    errors: {
      failedToParseYoutubeId: string;
    };
  };
  fullTextSearchResultsComponent: {
    searchingInSongText: string;
    titleResults: string;
    textResults: string;
    first: string;
    total: string;
    noResults: string;
  };
  songHeaderComponent: {
    printTitle: string;
    showShortcutsTitle: string
  };
  songListComponent: {
    listIsEmpty: string;
    titleSuffix: string;
  };
  songPage: {
    titleSuffix: (titlePrefix: string) => string;
    keywords: (collectionName: string, songTitle: string) => string[];
    loadingSong: string;
    songNotFound: string;
    editSongButtonTitle: string;
    editSongButtonDesktop: string;
    editSongButtonMobile: string;
    discussSongButtonTitle: string;
    discussSongButtonDesktop: string
    discussSongButtonMobile: string
    gotoRandomSongInCatalogButtonTitle: string;
    gotoRandomSongInCatalogButtonDesktop: string
    gotoRandomSongInCatalogButtonMobile: string
  };
  songPrevNextNavigator: {
    nextSong: string;
    nextSongTitle: string;
    prevSong: string;
    prevSongTitle: string;
    toCollectionPrev: string;
    toCollectionNext: string;
    toCollectionTitle: string;
    gotoRandomSongInCollectionTitle: string;
    gotoRandomSongInCatalogTitle: string;
  };
  studioPage: {
    addSong: string;
    loading: string;
    collections: string;
    songs: string;
    songsListIsEmpty: string;
    addNewSongIntoPersonalCollection: string;
    meta: {
      title: string;
      description: string;
      keywords: string[];
    }
  };
  tunerPage: {
    title: string;
    tone: string;
    toneClassic: string;
    toneElectro: string;
    repeat: string;
    hotKeys: string;
    stringByKeyDetails: string;
    pauseOrPlay: string;
    stringPrevNextKeyDetails: string;
    toneSelectionDetails: string;
    repeatModeDetails: string;
    pauseButton: string;
    meta: {
      title: string;
      description: string;
      keywords: string[];
    };
  };
  userCollectionEditorComponent: {
    actionConfirmationPrompt: string;
    closeButton: string;
    collectionRemovalCheckboxTitle: string;
    collectionSettings: string;
    collectionWasRemoved: string;
    deleteCollectionButtonNotConfirmedTitle: string;
    deleteCollectionButtonTitle: string;
    failedToRemoveCollection: string;
    removeButton: string;
  };
  userCollectionsListComponent: {
    titleText: (collectionName: string, songCount: number) => string;
    newCollectionInputPlaceholder: string;
    createCollectionButton: string;
    createCollectionButtonTitle: string;
  };
  userRegistrationPromptComponent: {
    close: string;
    register: string;
    or: string;
    signIn: string;
    toAddSongs: string;
  };
}
