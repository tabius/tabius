export const PARAM_COLLECTION_MOUNT = 'collectionMount';
export const PARAM_PRIMARY_COLLECTION_MOUNT = 'primaryCollectionMount';
export const PARAM_SONG_MOUNT = 'songMount';

export const MOUNT_CATALOG = 'catalog';
export const LINK_CATALOG = `/${MOUNT_CATALOG}`;

export const MOUNT_SCENE = 'scene';
export const LINK_SCENE = `/${MOUNT_SCENE}`;

export const MOUNT_COLLECTION_PREFIX = 'chords/';
export const MOUNT_COLLECTION = `${MOUNT_COLLECTION_PREFIX}:${PARAM_COLLECTION_MOUNT}`;

export const MOUNT_SONG_PREFIX = 'song/';
export const MOUNT_SONG = `${MOUNT_SONG_PREFIX}:${PARAM_COLLECTION_MOUNT}/:${PARAM_SONG_MOUNT}`;
export const MOUNT_SONG_IN_SECONDARY_COLLECTION = `${MOUNT_SONG_PREFIX}:${PARAM_COLLECTION_MOUNT}/:${PARAM_SONG_MOUNT}/:${PARAM_PRIMARY_COLLECTION_MOUNT}`;
export const MOUNT_PRINT_SUFFIX = '$print';
export const MOUNT_SONG_PRINT = `${MOUNT_SONG_PREFIX}:${PARAM_COLLECTION_MOUNT}/:${PARAM_SONG_MOUNT}/:${PARAM_PRIMARY_COLLECTION_MOUNT}/${MOUNT_PRINT_SUFFIX}`;

export const MOUNT_TUNER = 'tuner';
export const LINK_TUNER = `/${MOUNT_TUNER}`;

export const MOUNT_STUDIO = 'studio';
export const LINK_STUDIO = `/${MOUNT_STUDIO}`;

export const MOUNT_SETTINGS = 'settings';
export const LINK_SETTINGS = `/${MOUNT_SETTINGS}`;

export const MOUNT_PAGE_NOT_FOUND = '404';
