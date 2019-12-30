import {I18n} from '@common/i18n/i18n';

export const TRANSLATIONS_MAP_RU: I18n = {
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
    favorites: 'Избранное',
  },
};
