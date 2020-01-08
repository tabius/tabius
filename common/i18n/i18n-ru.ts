import {I18n} from '@common/i18n/i18n';
import {CollectionType, isBand, isCompilation} from '@common/catalog-model';

const FAVORITES_COLLECTION_NAME = 'Избранное';

export const TRANSLATIONS_MAP_RU: I18n = {
  common: {
    favoritesCollectionName: FAVORITES_COLLECTION_NAME,
    error: (message: string) => `Ошибка: ${message}`,
  },
  navbar: {
    catalog: 'КАТАЛОГ',
    forum: 'ФОРУМ',
    logo2: 'табы и аккорды',
    noSleep: 'БЛОК. СНА',
    noSleepTitle: 'Режим всегда включенного экрана',
    settings: 'НАСТРОЙКИ',
    studio: 'СТУДИЯ',
    tuner: 'ТЮНЕР',
    userIconTitle: (username: string) => `Аккаунт: ${username}`
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
    artistsHeader: 'Артисты',
    noArtistsFound: 'Артисты не найдены',
    songsHeader: 'Песни',
    addNewArtist: 'Добавить',
    addNewArtistTitle: 'Добавить исполнителя или коллекцию в каталог',
    searchResultsPrefix: 'Результаты поиска для',
    meta: {
      title: 'Каталог: все исполнители и коллекции песен',
      description: 'Полный список всех исполнителей и коллекций на Tabius. Поиск песен и аккордов по тексту и исполнителю.',
      keywords: ['табы', 'аккорды', 'гитара', 'список артистов', 'поиск песни по тексту'],
    },
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
      description: (name: string, firstSongs: string) => `${name} — песни и аккорды для гитары: ${firstSongs}`,
      keywords: (name: string) => [`${name} аккорды`, `табы ${name}`, `подбор ${name}`, `текст ${name}`, `песни ${name}`],
    },
  },
  shortcuts: {
    title: 'Горячие клавиши',
    nextSong: 'Следующая песня',
    prevSong: 'Предыдущая песня',
    saveSong: 'Сохранить изменения (в режиме редактирования)',
    showHelp: 'Показать этот диалог',
    collectionPage: {
      addSong: 'Добавить песню',
    },
    songPage: {
      editSong: 'Изменить подбор',
      resetTranspose: 'Отменить транспонирование',
      transposeDown: 'Транспонировать на тон ниже',
      transposeUp: 'Транспонировать на тон выше',
    },
    close: 'Закрыть',
  },
  moderatorPrompt: {
    youAreNotModerator: 'Вы не модератор и не можете изменять публичный каталог :(',
    but: 'Однако!',
    howToBecomeModeratorHtml: 'Роль модератора не сложно получить:<br>предложите несколько своих подборов на форуме.',
    forumLink: 'Перейти на форум »',
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
};
