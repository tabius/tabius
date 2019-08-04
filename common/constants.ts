export const TABIUS_BASE_API_URL = 'TABIUS_BASE_API_URL';

/** Browser store names. */
export const USER_STORE_NAME = 'user';
export const ARTISTS_STORE_NAME = 'artists';
export const APP_STORE_NAME = 'tabius';

/** Injection tokens for browser stores. */
export const TABIUS_USER_BROWSER_STORE_TOKEN = 'user';
export const TABIUS_ARTISTS_BROWSER_STORE_TOKEN = 'artists';
export const APP_BROWSER_STORE_TOKEN = 'tabius';

export const NODE_BB_SESSION_COOKIE = 'express.sid';
export const NODE_BB_COOKIE_DOMAIN = '.tabius.ru';
export const NODE_BB_URL = 'https://forum.tabius.ru';
export const NODE_BB_LOGIN_URL = `${NODE_BB_URL}/login`;
export const NODE_BB_REGISTRATION_URL = `${NODE_BB_URL}/register`;

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
