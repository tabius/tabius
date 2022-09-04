/** Browser store names. */
import {environment} from '@app/environments/environment';

export const USER_STORE_NAME = 'user';
export const CATALOG_STORE_NAME = 'catalog';
export const APP_STORE_NAME = 'tabius';

/** Injection tokens for browser stores. */
export const TABIUS_USER_BROWSER_STORE_TOKEN = 'user';
export const TABIUS_CATALOG_BROWSER_STORE_TOKEN = 'catalog';
export const APP_BROWSER_STORE_TOKEN = 'tabius';

export const TELEGRAM_CHANNEL_URL = environment.telegramUrl;
