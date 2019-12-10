/** Browser store names. */
import {environment} from '@app/environments/environment';

export const USER_STORE_NAME = 'user';
export const CATALOG_STORE_NAME = 'catalog';
export const APP_STORE_NAME = 'tabius';

/** Injection tokens for browser stores. */
export const TABIUS_USER_BROWSER_STORE_TOKEN = 'user';
export const TABIUS_CATALOG_BROWSER_STORE_TOKEN = 'catalog';
export const APP_BROWSER_STORE_TOKEN = 'tabius';

export const NODE_BB_URL = environment.nodeBbUrl;
export const NODE_BB_SESSION_COOKIE = 'express.sid';
export const NODE_BB_COOKIE_DOMAIN = environment.nodeBbCookieDomain;
export const NODE_BB_LOGIN_URL = `${environment.nodeBbUrl}/login`;
export const NODE_BB_REGISTRATION_URL = `${environment.nodeBbUrl}/register`;
export const NODE_BB_ADD_NEW_CATEGORY_URL = `${environment.nodeBbUrl}/category/406`;

// the values below should be in sync with 'dimensions.scss'
// export const MAX_MOBILE_WIDTH = 899;
export const MIN_DESKTOP_WIDTH = 900;
export const HIRES_DESKTOP_WIDTH = 1921;

export const MOBILE_NAV_HEIGHT = 60;
export const DESKTOP_NAV_HEIGHT = 164;

// Used as optimal mobile width in SSR rendering.
export const SSR_MOBILE_WIDTH = 360;
export const SSR_DESKTOP_WIDTH = 1920;

export const INVALID_ID = -1;

export const USER_COLLECTION_MOUNT_SEPARATOR = '--';
export const USER_FAV_COLLECTION_NAME = 'Избранное';
export const USER_FAV_COLLECTION_SUFFIX = 'favorite';
