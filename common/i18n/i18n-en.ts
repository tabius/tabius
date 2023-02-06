import {I18n} from '@common/i18n/i18n';
import {CollectionType, isBand, isCompilation, isPerson} from '@common/catalog-model';
import {User} from '@common/user-model';

const FAVORITES_COLLECTION_NAME = 'Favorites';

export const TRANSLATIONS_MAP_EN: I18n = {
  common: {
    pageTitle: 'Chords & Tabs',
    pageDescription: 'Chords and tabs for your favorite songs',
    keywords: ['chords', 'guitar tabs'],
    favoritesCollectionName: FAVORITES_COLLECTION_NAME,
    and: 'and',
    error: (message: string) => `Error: ${message}`,
    unexpectedError: 'Unexpected internal error!',
    serverRequestError: 'Error connecting to server!',
    failedToCreateCollection: 'Failed to create new collection!',
    catalog: 'Catalog'
  },
  navbar: {
    accountInfoNotLoggedInToast: 'You are not logged in',
    accountInfoToast: (user: User) => `Account: ${user.nickname}, ${user.email}`,
    catalog: 'CATALOG',
    scene: 'SCENE',
    historyButton: 'HISTORY',
    historyButtonTitle: 'Show catalog browing history',
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
    sceneFlagCheckboxName: 'Scene',
    sceneFlagOnMessage: 'Song is added to Scene',
    sceneFlagOffMessage: 'Song is removed from Scene',
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
    gotoResultsTitle: 'Go to results',
    artistsHeader: 'Artists',
    noArtistsFound: 'No artists found',
    songsHeader: 'Songs',
    addNewArtist: 'Add',
    addNewArtistTitle: 'Add new artist or collection to the catalog',
    searchResultsPrefix: 'Search results for',
    listItemTitleSuffix: function (type: CollectionType): string {
      return `go to the list of songs ${(isPerson(type) ? 'for the artist' : isBand(type) ? 'for the band' : 'in the collection')}`;
    },
    meta: {
      title: 'Catalog: all artists and collections',
      description: 'Full list of all artists and collections on Tabius. Search songs by artist name, title and song.',
      keywords: ['tabs', 'chords', 'guitar', 'artists list', 'search song by text'],
    },
  },
  scenePage: {
    pageTitle: 'Song of the day: a new song every day',
    pageDescription: 'Scene is a place where you can find a new song with guitar chords every day.',
    pageKeywords: ['song of the day', 'best song', 'guitar chords'],
    title: 'Scene: a new song every day',
    loadingMessage: 'Loading…',
  },
  chordImage: {
    chordsLayoutTitleSuffix: ', chord layout',
  },
  collectionBreadcrumb: {
    catalogLink: 'Catalog',
    catalogLinkTitle: 'Go to catalog',
    studioLink: 'Studio',
    studioLinkTitle: 'Go to personal collections',
  },
  footer: {
    closeMenu: 'CLOSE',
    githubLinkTitle: 'Current version.\nClick to see the latest changes.',
    homePageLinkTitle: 'Home',
    menu: 'menu',
    twitterLinkTitle: 'Read the latest site news in Twitter.',
  },
  collectionEditor: {
    header: 'Add collection',
    collectionName: 'Name',
    collectionMount: 'Mount',
    collectionType: 'Type',
    person: 'Person',
    band: 'Band',
    compilation: 'Compilation',
    create: 'Create',
    close: 'Close',
  },
  collectionPage: {
    collectionNotFound: 'Collection not found',
    loadingSongList: 'Loading list of songs …',
    addSong: 'Add song',
    collectionsSettings: 'Settings',
    supportLink: 'Support artist »',
    supportLinkTitle: 'Support artist and buy official records.',
    meta: {
      title: (name: string, type: CollectionType) => {
        const typeInfo = isCompilation(type) ? ', collection ' : (isBand(type) ? ', band' : '');
        return `${name}${typeInfo} — songs, chords and tabs for guitar`;
      },
      description: (firstSongs: string) => `Songs with tabs and chords: ${firstSongs}`,
      keywords: (name: string) => [`${name} chords`, `${name} tabs`, `${name} lyrics`, `${name} songs`],
    },
  },
  shortcuts: {
    title: 'Hot keys',
    nextSong: 'Next song',
    prevSong: 'Previous song',
    saveSong: 'Save song (in edit mode)',
    playChordSound: 'Play sound of the clicked chord',
    showHelp: 'Show this dialog',
    gotoRandomSongInCollection: 'Go to random song in collection',
    gotoRandomSongInCatalog: 'Go to random song in catalog',
    twice: 'twice',
    left: 'left',
    right: 'right',
    collectionPage: {
      addSong: 'Add song',
    },
    songPage: {
      editSong: 'Edit song',
      resetTranspose: 'Reset transpose',
      transposeDown: 'Transpose a half-tone down',
      transposeUp: 'Transpose a half-tone up',
      changeSongFontSize: 'Change song font size',
      scrollToSongStart: 'Scroll to song start',
      scrollPageUp: 'Scroll one page up',
      scrollPageDown: 'Scroll one page down',
    },
    close: 'Close',
  },
  moderatorPrompt: {
    youAreNotModerator: 'You are not moderator and can\'t change public catalog :(',
    but: 'But!',
    butLine1: 'It is not hard to become a moderator:',
    butLine2: 'suggest chords to a couple of songs in our',
    butTelegram: 'Telegram channel',
    also: 'And...',
    alsoLine1: 'Anyone can create collections and add songs',
    alsoLine2: 'in their personal ',
    alsoStudio: 'STUDIO',
    close: 'close',
  },
  resourceNotFoundComponent: {
    tryToReloadPagePrompt: 'Try to reload the page when Online',
  },
  settingsPage: {
    pageHeader: 'Personal settings',
    loadingText: 'Loading settings …',
    songRenderingSettingsHeader: 'Song rendering',
    fontSize: 'Font size',
    h4Si: 'Render Si like ',
    favoriteKey: 'Favorite key',
    example: 'Example:',
    notSignedInPrompt: {
      register: 'Register',
      or: 'or',
      signIn: 'Sign In',
      toGetAccess: ' to get access to all settings.',
    },
    demoSongText:
        'F\n' +
        'Yesterday\n' +
        'Em7        A7              Dm Dm/C\n' +
        'Love was such an easy game to play\n' +
        'Hb             C              F\n' +
        'Now I need a place to hide away\n' +
        '   Dm       G   Hb     F\n' +
        'Oh I believe in yesterday',
  },
  signinSignoutButton: {
    signIn: 'Sign in',
    signOut: 'Sign out',
  },
  homePage: {
    titleLevel2: 'guitar chords and tabs for songs you love',
    newsLink: 'NEWS',
    catalogLink: 'CATALOG',
    studioLink: 'STUDIO',
    interestingFacts: 'About Tabius',
    worksWithNoInternetFact: 'You do not need to be online to use Tabius! All songs opened when online are available offline.',
    noAdsFact: 'We have no ads. Links to the official media and merch only. This is our gratitude for artists.',
    openSourceFact: {
      tabiusSourceCode: 'Tabius source code',
      isOpenOnGithub: 'is open on Github',
      useAndImprove: 'Help us to improve Tabius or use it for your own needs',
    },
    forMusicLoversFact: 'This site is free and open for everyone who loves music. It won\'t change',
  },
  chordPopover: {
    playChordText: 'play »',
    discussionLink: 'improve »',
    discussionLinkTitle: 'Go to the chords discussion page',
    tabiusHasNoChordLayout: 'Unfortunately Tabius does not have a visual layout for this chord.',
    discussLink: {
      title: 'Add visual layout for the chord',
      prefix: 'You can help Tabius and',
      link: 'add',
      suffix: 'layout for the chord!',
    },
  },
  songComponent: {
    loadingMessage: 'Loading song…',
  },
  songChordsComponent: {
    chordsTitle: 'Chords:',
    transposeUp: 'Transpose a half-tone up',
    transposeDown: 'Transpose a half-tone down',
    originalKey: 'Original key',
    favoriteKey: 'Favorite key',
    simpleKey: 'Simple key',
  },
  songEditorComponent: {
    loadingMessage: 'Loading song details…',
    titlePlaceholder: 'Song title',
    mountPlaceholder: 'Song link',
    textPlaceholder: 'Song text with chords',
    youtubeLinkPlaceholder: 'YouTube link',
    create: 'Create',
    update: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    deleteConfirmationTitle: 'Confirm song deletion',
    deleteTitle: 'Delete song',
    deleteRequiresConfirmationTitle: 'To confirm song deletion please use checkbox on the left.',
    toasts: {
      songTitleIsRequired: 'Song title is required',
      songTextIsRequired: 'Song text is required',
      failedToCreateSongPrefix: 'Failed to create song: ',
      saved: 'Song was updated',
      failedToSavePrefix: 'Failed to update song: ',
      deleteConfirmationIsRequired: 'To confirm song deletion please use checkbox on the left.',
      failedToDeleteSong: 'Failed to delete song!',
      songWasDeleted: 'Song was deleted.',
    },
    errors: {
      failedToParseYoutubeId: 'Failed to parse YouTube link!',
    },
  },
  fullTextSearchResultsComponent: {
    searchingInSongText: 'Searching in songs..',
    titleResults: 'Song name:',
    textResults: 'Song text:',
    first: 'first',
    total: 'total',
    noResults: 'no results',
  },
  songHeaderComponent: {
    printTitle: 'Print song with chords',
    showShortcutsTitle: 'Show keyboard shortcuts',
    goToCollectionTitle: 'Go to collection page',
  },
  songListComponent: {
    listIsEmpty: 'No songs found',
    songLinkTitleSuffix: ' — song text and chords',
    songPrimaryCollectionLinkTitle: 'Primary song collection',
  },
  songPage: {
    titleSuffix: (titlePrefix: string) => titlePrefix.length > 50 ? 'chords' : titlePrefix.length > 35 ? 'text and chords' : 'song text and chords',
    keywords: (collectionName: string, songTitle: string) => [
      `chords ${songTitle}`,
      collectionName,
      'tabs',
      'chords',
      'song text',
      'lyrics',
      'fingering',
      'guitar',
    ],
    loadingSong: 'Loading song text…',
    songNotFound: 'Song not found',
    editSongButtonTitle: 'Open song editor (Shift + E)',
    editSongButtonDesktop: 'Edit song',
    editSongButtonMobile: 'Edit',
    discussSongButtonTitle: 'Discuss song chords in chat',
    discussSongButtonDesktop: 'Discuss in chat',
    discussSongButtonMobile: 'Discuss',
    fontSize: 'Font size',
    gotoRandomSongInCollectionMenu: 'Collection',
    gotoRandomSongInCatalogMenu: 'Catalog',
    searchSongOnYoutubeLinkText: 'Open on YouTube',
    searchSongOnYoutubeLinkTitle: 'Search song video on YouTube',
  },
  songPrevNextNavigator: {
    nextSong: 'Next. song »',
    nextSongTitle: 'Open previous song (SHIFT + right arrow)',
    prevSong: '« Prev. song',
    prevSongTitle: 'Open next song (SHIFT + left arrow)',
    toCollectionPrev: '« To collection',
    toCollectionNext: 'To collection »',
    toCollectionTitle: 'To collection',
    gotoRandomSongInCollectionTitle: 'Open random song from the same collection (right SHIFT twice)',
    gotoRandomSongInCatalogTitle: 'Open random song from the whole catalog (left SHIFT twice)',
    gotoRandomSongInCollectionButton: 'Collection',
    gotoRandomSongInCatalogButton: 'Catalog'
  },
  studioPage: {
    addSong: 'Add song',
    addNewSongIntoPersonalCollection: 'Add new song into personal collection',
    collections: 'Collections',
    loading: 'Loading …',
    songs: 'Songs',
    songsListIsEmpty: 'Songs list is empty',
    meta: {
      title: 'Studio: personal songs & collections',
      description: 'Studio page contains personal user\'s songs and collection.',
      keywords: ['chords', 'tabs', 'guitar', 'playlist'],
    },
  },
  tunerPage: {
    hotKeys: 'Shortcuts',
    pauseOrPlay: 'pause/play',
    repeat: 'repeat',
    repeatModeDetails: 'repeat mode: on/off.',
    stringByKeyDetails: 'string: by number',
    stringPrevNextKeyDetails: 'string: previous/next',
    title: 'Guitar tuner',
    tone: 'Tone',
    toneClassic: 'Classic',
    toneElectro: 'Electro',
    toneSelectionDetails: 'tone: Classic/Electro',
    pauseButton: 'PAUSE',
    meta: {
      title: 'Guitar tuner',
      description: 'Simple online guitar tune.',
      keywords: ['guitar tuner', 'tuner', 'online tuner', 'guitar'],
    },
  },
  userCollectionEditorComponent: {
    actionConfirmationPrompt: 'Please confirm collection removal!',
    closeButton: 'Close',
    collectionRemovalCheckboxTitle: 'Check to confirm action',
    collectionSettings: 'Collection settings',
    collectionWasRemoved: 'Collection was removed.',
    deleteCollectionButtonNotConfirmedTitle: 'Please confirm collection removal by using checkbox on the left.',
    deleteCollectionButtonTitle: 'Delete collection',
    failedToRemoveCollection: 'Error while removing collection!',
    removeButton: 'Delete'
  },
  userCollectionsListComponent: {
    createCollectionButton: 'Create',
    createCollectionButtonTitle: 'Create new collection',
    newCollectionInputPlaceholder: 'New collection name',
    titleText: (collectionName: string, songCount: number) => `Collection «${collectionName}», ${songCount == 0 ? 'empty' : `songs: ${songCount}`}`,
  },
  userRegistrationPromptComponent: {
    close: 'close',
    register: 'Register',
    or: 'or',
    signIn: 'sign in',
    toAddSongs: 'to add songs.',
  },
  browserStateService: {
    noSleepModeIsOff: 'NoSleep mode is OFF.',
    noSleepModeIsOn: 'NoSleep mode is ON.',
  },
  loadingIndicatorWarning: {
    reloadLink: 'Reload',
    reloadNotice: 'If loading takes too long try to reload whole page.',
  },
  navigationHistoryPopup: {
    title: 'History',
  },
  moveSongToCollectionComponent: {
    moveButtonText: 'Move',
  },
};
