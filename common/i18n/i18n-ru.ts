import {I18n} from '@common/i18n/i18n';

const FAVORITES_COLLECTION_NAME = 'Избранное';

export const TRANSLATIONS_MAP_RU: I18n = {
  common: {
    favoritesCollectionName: FAVORITES_COLLECTION_NAME,
  },
  navbar: {
    catalog: 'КАТАЛОГ',
    forum: 'ФОРУМ',
    logo2: 'табы для гитары',
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
};
