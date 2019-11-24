export const FORUM_LINK = 'https://forum.tabius.ru';
export const FORUM_LINK_ADD_NEW_CATEGORY = `${FORUM_LINK}/category/406`;

export const PARAM_COLLECTION_MOUNT = 'collectionMount';
export const PARAM_PRIMARY_COLLECTION_MOUNT = 'primaryCollectionMount';
export const PARAM_SONG_MOUNT = 'songMount';

export const MOUNT_CATALOG = 'catalog';
export const MOUNT_COLLECTION_PREFIX = 'chords/';
export const MOUNT_COLLECTION = `${MOUNT_COLLECTION_PREFIX}:${PARAM_COLLECTION_MOUNT}`;

export const MOUNT_SONG_PREFIX = 'song/';
export const MOUNT_SONG = `${MOUNT_SONG_PREFIX}:${PARAM_COLLECTION_MOUNT}/:${PARAM_SONG_MOUNT}`;
export const MOUNT_SONG_IN_SECONDARY_COLLECTION = `${MOUNT_SONG_PREFIX}:${PARAM_COLLECTION_MOUNT}/:${PARAM_SONG_MOUNT}/:${PARAM_PRIMARY_COLLECTION_MOUNT}`;
export const MOUNT_PRINT_SUFFIX = '$print';
export const MOUNT_SONG_PRINT = `${MOUNT_SONG_PREFIX}:${PARAM_COLLECTION_MOUNT}/:${PARAM_SONG_MOUNT}/${MOUNT_PRINT_SUFFIX}`;

export const MOUNT_TUNER = 'tuner';
export const MOUNT_USER_STUDIO = 'studio';
export const LINK_USER_STUDIO = `/${MOUNT_USER_STUDIO}`;
export const MOUNT_USER_SETTINGS = 'settings';

export const MOUNT_PAGE_NOT_FOUND = '404';
