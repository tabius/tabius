import {UserInfo} from 'firebase/app';
import {Versioned, WithId} from '@common/common-model';

export const AUTH_TOKEN_COOKIE_NAME = 'tabius-at';
export const USERS_STORE_SCHEMA_VERSION = 3;

export type FirebaseUser = UserInfo;

export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}

/**
 * Settings that stored in the browser and never saved on server.
 * Usually these settings are different per device. Example: font sizes.
 */
export interface UserDeviceSettings {
  songFontSize: number;
}

export function newDefaultUserDeviceSettings(): UserDeviceSettings {
  return {
    songFontSize: getDefaultUserSongFontSize()
  };
}

/** User settings stored on the server. */
export interface UserSettings {
  /** User mount tag. Can only be used for signed in users. */
  mount: string,
  songs: { [songId: number]: UserSongSettings },
  /** If true => B will be rendered instead of H for the tone Si. */
  b4Si?: boolean,
}

/** Per song settings. */
export interface UserSongSettings {
  songId: number;
  transpose: number;
}

export function newDefaultUserSongSettings(songId: number): UserSongSettings {
  return {
    songId,
    transpose: 0
  };
}

export function newDefaultUserSettings(): UserSettings {
  return {
    mount: 'not-signed-in?',
    songs: {}
  };
}

const SONG_FONT_SIZE_MOBILE = 16;
const SONG_FONT_SIZE_DESKTOP = 18;
const SONG_FONT_SIZE_HIRES_DESKTOP = 20;
const MIN_DESKTOP_WIDTH = 900;
const HIRES_DESKTOP_WIDTH = 1921;

export function getDefaultUserSongFontSize(): number {
  const width = window && window.innerWidth;
  return !width || (width >= MIN_DESKTOP_WIDTH && width < HIRES_DESKTOP_WIDTH)
      ? SONG_FONT_SIZE_DESKTOP
      : width < MIN_DESKTOP_WIDTH
          ? SONG_FONT_SIZE_MOBILE
          : SONG_FONT_SIZE_HIRES_DESKTOP;
}


export interface Playlist extends WithId, Versioned {
  userId: string,
  name: string;
  /** Unique for all user playlists.*/
  mount: string;
  songIds: number[];
}
