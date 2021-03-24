import {I18n} from '@common/i18n/i18n';
import {CollectionType, isBand, isCompilation, isPerson} from '@common/catalog-model';
import {User} from '@common/user-model';

const FAVORITES_COLLECTION_NAME = 'Избранное';

export const TRANSLATIONS_MAP_RU: I18n = {
  common: {
    favoritesCollectionName: FAVORITES_COLLECTION_NAME,
    and: 'и',
    error: (message: string) => `Ошибка: ${message}`,
    unexpectedError: 'Ошибка в работе приложения!',
    serverRequestError: 'Ошибка при обращении к серверу!',
    failedToCreateCollection: 'Не удалось создать коллекцию!',
    catalog: 'Каталог',
  },
  navbar: {
    accountInfoNotLoggedInToast: 'Вы не вошли в систему',
    accountInfoToast: (user: User) => `Аккаунт: ${user.username}, ${user.email}`,
    catalog: 'КАТАЛОГ',
    historyButton: 'ИСТОРИЯ',
    historyButtonTitle: 'История просмотра каталога',
    forum: 'ФОРУМ',
    logo2: 'табы и аккорды',
    noSleep: 'БЛОК. СНА',
    noSleepTitle: 'Режим всегда включенного экрана',
    settings: 'НАСТРОЙКИ',
    studio: 'СТУДИЯ',
    tuner: 'ТЮНЕР',
    userIconTitle: (username: string) => `Аккаунт: ${username}`,
  },
  page404: {
    message: 'Страница не найдена!',
  },
  addSongToCollection: {
    title: 'Добавить в коллекцию:',
    addToCollectionCheckboxTitle: (collectionName) => `Добавить песню в коллекцию «${collectionName}»`,
    gotoCollection: 'перейти »',
    gotoCollectionTitle: 'Перейти на страницу коллекции',
    addToFavoritesCheckboxTitle: 'Добавить песню в коллекцию',
    favorites: FAVORITES_COLLECTION_NAME,
  },
  catalogPage: {
    title: 'Каталог',
    loadingMessage: 'Загружаем каталог…',
    searchInputPlaceholder: 'поиск по имени и тексту',
    searchInputTitle: 'Поиск по имени артиста или тексту песни',
    clearButtonTitle: 'Очистить фильтр',
    clear: 'Очистить',
    showAllCollections: 'ВСЕ',
    showAllCollectionsTitle: 'Показать все коллекции',
    gotoResultsTitle: 'Перейти к результатам',
    artistsHeader: 'Артисты',
    noArtistsFound: 'Артисты не найдены',
    songsHeader: 'Песни',
    addNewArtist: 'Добавить',
    addNewArtistTitle: 'Добавить исполнителя или коллекцию в каталог',
    searchResultsPrefix: 'Результаты поиска для',
    listItemTitleSuffix: function (type: CollectionType): string {
      const typeName = isPerson(type) ? 'артиста' : isBand(type) ? 'группы' : ' коллекции';
      return `перейти к списку песен ${typeName}`;
    },
    meta: {
      title: 'Каталог: все исполнители и коллекции песен',
      description: 'Полный список всех исполнителей и коллекций на Tabius. Поиск песен и аккордов по тексту и исполнителю.',
      keywords: ['табы', 'аккорды', 'гитара', 'список артистов', 'поиск песни по тексту'],
    }
  },
  chordImage: {
    chordsLayoutTitleSuffix: ', аппликатура аккорда',
  },
  collectionBreadcrumb: {
    catalogLink: 'Каталог',
    catalogLinkTitle: 'Перейти в каталог',
    studioLink: 'Студия',
    studioLinkTitle: 'Перейти к списку своих коллекций',
  },
  footer: {
    twitterLinkTitle: 'Последние новости сервиса в Твиттер.',
    githubLinkTitle: 'Текущая версия приложения.\nПосмотреть последние изменения',
    homePageLinkTitle: 'Перейти на главную страницу сайта.',
    closeMenu: 'ЗАКРЫТЬ МЕНЮ',
  },
  collectionEditor: {
    header: 'Добавление коллекции',
    collectionName: 'Имя коллекции',
    collectionMount: 'Адрес страницы',
    collectionType: 'Тип коллекции',
    person: 'Персона',
    band: 'Группа',
    compilation: 'Сборник',
    create: 'Создать',
    close: 'Закрыть',
  },
  collectionPage: {
    collectionNotFound: 'Коллекция не найдена',
    loadingSongList: 'Загружаем список песен…',
    addSong: 'Добавить песню',
    collectionsSettings: 'Настроить',
    supportLink: 'Поддержать артиста »',
    supportLinkTitle: 'Поддержать исполнителя и купить его официальный диск.',
    meta: {
      title: (name: string, type: CollectionType) => {
        const typeInfo = isCompilation(type) ? ', сборник ' : (isBand(type) ? ', группа' : '');
        return `${name}${typeInfo} — тексты песен и аккорды для гитары`;
      },
      description: (firstSongs: string) => `Список песен с аккордами: ${firstSongs}`,
      keywords: (name: string) => [`${name} аккорды`, `табы ${name}`, `подбор ${name}`, `текст ${name}`, `песни ${name}`],
    },
  },
  shortcuts: {
    title: 'Горячие клавиши',
    nextSong: 'Следующая песня',
    prevSong: 'Предыдущая песня',
    saveSong: 'Сохранить изменения (в режиме редактирования)',
    showHelp: 'Показать этот диалог',
    gotoRandomSongInCollection: 'Случайная песня в коллекции',
    gotoRandomSongInCatalog: 'Случайная песня в каталоге',
    twice: '2 раза',
    left: 'левый',
    right: 'правый',
    collectionPage: {
      addSong: 'Добавить песню',
    },
    songPage: {
      editSong: 'Изменить подбор',
      resetTranspose: 'Отменить транспонирование',
      transposeDown: 'Транспонировать на полутон ниже',
      transposeUp: 'Транспонировать на полутон выше',
      changeSongFontSize: 'Изменить размер шрифта',
      scrollToSongStart: 'Скролл на начало песни',
      scrollPageUp: 'Скролл на одну страницу назад',
      scrollPageDown: 'Скролл на одну страницу вперёд',
    },
    close: 'Закрыть'
  },
  moderatorPrompt: {
    youAreNotModerator: 'Вы не модератор и не можете изменять публичный каталог :(',
    but: 'Однако!',
    butLine1: 'Роль модератора не сложно получить:',
    butLine2: 'предложите несколько своих подборов на',
    butForum: 'ФОРУМЕ',
    also: 'И ещё!',
    alsoLine1: 'Можно создавать любые коллекции и подборы',
    alsoLine2: 'у себя в ',
    alsoStudio: 'СТУДИИ',
    close: 'закрыть',
  },
  resourceNotFoundComponent: {
    tryToReloadPagePrompt: 'Попробуйте перегрузить страницу в режиме Онлайн'
  },
  settingsPage: {
    pageHeader: 'Персональные настройки',
    loadingText: 'Загружаем настройки …',
    songRenderingSettingsHeader: 'Отображение песен',
    fontSize: 'Размер шрифта',
    h4Si: 'Отображать Си как',
    favoriteKey: 'Любимая тональность',
    example: 'Пример:',
    notSignedInPrompt: {
      register: 'Зарегистрируйтесь',
      or: 'или',
      signIn: 'войдите',
      toGetAccess: ', чтобы получить доступ к расширенным настройкам.',
    },
    demoSongText:
        'Bm                           D\n' +
        'Песен, еще не написанных, сколько?\n' +
        '           A   Em\n' +
        'Скажи, кукушка,\n' +
        '   Bm\n' +
        'Пропой.\n'
  },
  signinSignoutButton: {
    signIn: 'Вход',
    signOut: 'Выход',
  },
  homePage: {
    titleLevel2: 'табы и аккорды популярных песен для гитары',
    newsLink: 'НОВОСТИ',
    catalogLink: 'КАТАЛОГ',
    studioLink: 'СТУДИЯ',
    interestingFacts: 'Интересные факты о Tabius',
    worksWithNoInternetFact: 'Tabius работает без Интернет! Все однажды открытые песни доступны оффлайн.',
    noAdsFact: 'У нас нет рекламы. Только ссылки на официальные диски. Это благодарность авторам.',
    openSourceFact: {
      tabiusSourceCode: 'Исходный код Tabius',
      isOpenOnGithub: 'открыт на GitHub',
      useAndImprove: 'Используйте его для себя и улучшайте Tabius!',
    },
    forMusicLoversFact: 'В первую очередь этот сайт сделан для музыки и её любителей. Это не поменяется.',
  },
  chordPopover: {
    discussionLink: 'обсудить »',
    discussionLinkTitle: 'Перейти на страницу с обсуждением аппликатур аккордов',
    tabiusHasNoChordLayout: 'К сожалению Tabius не знает аппликатуру для этого аккорда.',
    forumLink: {
      title: 'Добавить свою аппликатуру аккорда',
      prefix: 'Вы можете помочь и',
      link: 'добавить',
      suffix: 'свою!',
    },
  },
  songComponent: {
    loadingMessage: 'Загружаем текст песни…',
  },
  songChordsComponent: {
    chordsTitle: 'Аккорды:',
    transposeUp: 'Транспонировать на полутон выше (SHIFT + ⇧)',
    transposeDown: 'Транспонировать на полутон ниже (SHIFT + ⇩)',
    originalKey: 'Оригинальная тональность (SHIFT + 0)',
    favoriteKey: 'Любимая тональность',
    simpleKey: 'Простая тональность',
  },
  songEditorComponent: {
    loadingMessage: 'Загружаем детали песни…',
    titlePlaceholder: 'Название песни',
    mountPlaceholder: 'Адрес песни',
    textPlaceholder: 'Текст песни с аккордами',
    youtubeLinkPlaceholder: 'Ссылка на YouTube',
    create: 'Создать',
    update: 'Сохранить',
    cancel: 'Отменить',
    delete: 'Удалить',
    deleteConfirmationTitle: 'Подтверждение удаления песни',
    deleteTitle: 'Удалить песню',
    deleteRequiresConfirmationTitle: 'Необходимо подтвердить удаление песни: поставьте отметку слева.',
    toasts: {
      songTitleIsRequired: 'Необходимо указать название песни',
      songTextIsRequired: 'Текст песни не может быть пуст',
      failedToCreateSongPrefix: 'Не удалось создать песню: ',
      saved: 'Изменения сохранены',
      failedToSavePrefix: 'Изменения не сохранены: ',
      deleteConfirmationIsRequired: 'Необходимо подтвердить действие!',
      failedToDeleteSong: 'Ошибка при удалении песни!',
      songWasDeleted: 'Песня удалена.',
    },
    errors: {
      failedToParseYoutubeId: 'Некорректная ссылка на видео в YouTube!',
    },
  },
  fullTextSearchResultsComponent: {
    searchingInSongText: 'Поиск в тексте песен...',
    titleResults: 'В имени:',
    textResults: 'В тексте:',
    first: 'первые',
    total: 'всего',
    noResults: 'нет результатов',
  },
  songHeaderComponent: {
    printTitle: 'Распечатать текст и аккорды',
    showShortcutsTitle: 'Показать горячие клавиши',
  },
  songListComponent: {
    listIsEmpty: 'Нет песен',
    songLinkTitleSuffix: ' — текст песни и аккорды',
    songPrimaryCollectionLinkTitle: 'Исполнитель',
  },
  songPage: {
    titleSuffix: (titlePrefix: string) => titlePrefix.length > 50 ? 'аккорды' : titlePrefix.length > 35 ? 'текст и аккорды' : 'текст песни и аккорды',
    keywords: (collectionName: string, songTitle: string) => [
      `подбор ${songTitle}`,
      collectionName,
      'табы',
      'аккорды',
      'текст песни',
      'стихи',
      'аппликатура',
      'гитара',
    ],
    loadingSong: 'Загружаем текст песни…',
    songNotFound: 'Песня не найдена',
    editSongButtonTitle: 'Исправить подбор песни (Shift + E)',
    editSongButtonDesktop: 'Исправить подбор',
    editSongButtonMobile: 'Исправить',
    discussSongButtonTitle: 'Обсудить подбор песни на форуме',
    discussSongButtonDesktop: 'Обсудить на форуме',
    discussSongButtonMobile: 'Обсудить',
    fontSize: 'Размер шрифта',
    gotoRandomSongInCollectionMenu: 'Коллекция',
    gotoRandomSongInCatalogMenu: 'Каталог',

  },
  songPrevNextNavigator: {
    nextSong: 'След. песня »',
    nextSongTitle: 'Перейти к следующей песне (SHIFT + стрелка вправо)',
    prevSong: '« Пред. песня',
    prevSongTitle: 'Перейти к предыдущей песне (SHIFT + стрелка влево)',
    toCollectionPrev: '« В коллекцию',
    toCollectionNext: 'В коллекцию »',
    toCollectionTitle: 'В коллекцию',
    gotoRandomSongInCollectionTitle: 'Перейти к случайной песне из текущей коллекции (правый SHIFT 2 раза)',
    gotoRandomSongInCatalogTitle: 'Перейти к случайной песне из всего каталога (левый SHIFT 2 раза)',
    gotoRandomSongInCollectionButton: 'Коллекция',
    gotoRandomSongInCatalogButton: 'Каталог'
  },
  studioPage: {
    addSong: 'Добавить',
    addNewSongIntoPersonalCollection: 'Добавить новую песню в персональную коллекцию',
    collections: 'Коллекции',
    loading: 'Загружаем …',
    songs: 'Подборы',
    songsListIsEmpty: 'Нет своих подборов',
    meta: {
      title: 'Студия: мои подборы',
      description: 'Список персональных подборов.',
      keywords: ['табы', 'гитара', 'аккорды', 'плейлист'],
    },
  },
  tunerPage: {
    hotKeys: 'Горячие клавиши',
    pauseOrPlay: 'пауза/старт',
    repeat: 'повтор',
    repeatModeDetails: 'режим повтора: вкл./выкл.',
    stringByKeyDetails: 'соотвествующая струна',
    stringPrevNextKeyDetails: 'выбор струны: пред./след.',
    title: 'Тюнер для гитары',
    tone: 'Тон',
    toneClassic: 'Классика',
    toneElectro: 'Электро',
    toneSelectionDetails: 'выбор тона: Классика/Электро',
    pauseButton: 'СТОП',
    meta: {
      title: 'Тюнер для гитары',
      description: 'Простой и удобный тюнер для настройки гитары на слух.',
      keywords: ['тюнер для гитары', 'тюнер', 'гитара', 'настройка гитары', 'настройка на слух'],
    },
  },
  userCollectionEditorComponent: {
    actionConfirmationPrompt: 'Необходимо подтвердить действие!',
    closeButton: 'Закрыть',
    collectionRemovalCheckboxTitle: 'Подтверждение удаления коллекции',
    collectionSettings: 'Настройки коллекции',
    collectionWasRemoved: 'Коллекция удалена.',
    deleteCollectionButtonNotConfirmedTitle: 'Необходимо подтвердить удаление коллекции: поставьте отметку слева.',
    deleteCollectionButtonTitle: 'Удалить коллекцию',
    failedToRemoveCollection: 'Ошибка при удалении коллекции!',
    removeButton: 'Удалить'
  },
  userCollectionsListComponent: {
    createCollectionButton: 'Создать',
    createCollectionButtonTitle: 'Создать новую коллекцию',
    newCollectionInputPlaceholder: 'Имя новой коллекции',
    titleText: (collectionName: string, songCount: number) => `Коллекция «${collectionName}», ${songCount == 0 ? 'нет песен' : `песен: ${songCount}`}`,
  },
  userRegistrationPromptComponent: {
    close: 'закрыть',
    register: 'Зарегистрируйтесь',
    or: 'или',
    signIn: 'войдите',
    toAddSongs: ', чтобы добавлять свои песни.',
  },
  browserStateService: {
    noSleepModeIsOff: 'Блокировка сна отключена.\nИспользуется режим по умолчанию.',
    noSleepModeIsOn: 'Включена блокировка сна.\nТеперь экран будет всегда включён.',
  },
  loadingIndicatorWarning: {
    reloadLink: 'Перегрузить',
    reloadNotice: 'При зависшей загрузке попробуйте перезагрузить страницу.',
  },
  navigationHistoryPopup: {
    title: 'История просмотров'
  }
};
