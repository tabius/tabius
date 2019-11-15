export const FORUM_LINK = 'https://forum.tabius.ru';

export const PARAM_COLLECTION_MOUNT = 'collectionMount';
export const PARAM_SONG_MOUNT = 'songMount';

export const MOUNT_CATALOG = 'catalog';
export const MOUNT_COLLECTION_PREFIX = 'chords/';
export const MOUNT_COLLECTION = `${MOUNT_COLLECTION_PREFIX}:${PARAM_COLLECTION_MOUNT}`;

export const MOUNT_SONG_PREFIX = 'song/';
export const MOUNT_SONG = `${MOUNT_SONG_PREFIX}:${PARAM_COLLECTION_MOUNT}/:${PARAM_SONG_MOUNT}`;
export const MOUNT_PRINT_SUFFIX = '_print_';
export const MOUNT_SONG_PRINT = `${MOUNT_SONG_PREFIX}:${PARAM_COLLECTION_MOUNT}/:${PARAM_SONG_MOUNT}/${MOUNT_PRINT_SUFFIX}`;

export const MOUNT_TUNER = 'tuner';
export const MOUNT_USER_STUDIO = 'studio';
export const MOUNT_USER_SETTINGS = 'settings';

export const MOUNT_PAGE_NOT_FOUND = '404';
