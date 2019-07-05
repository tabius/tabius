import {Versioned, WithStringId} from '@common/common-model';
import {HIRES_DESKTOP_WIDTH, MIN_DESKTOP_WIDTH} from '@common/constants';

export const USERS_STORE_SCHEMA_VERSION = 3;

export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly picture: string;
}

/**
 * Settings that stored in the browser and never saved on server.
 * Usually these settings are different per device. Example: font sizes.
 */
export interface UserDeviceSettings {
  /** Font size in pixels. */
  readonly songFontSize: number;
  /** If true -> repeat mode is checked by default in tuner. */
  readonly tunerRepeatMode: boolean;
  /** 'c' for Classic, 'e' for Electro. */
  readonly tunerToneType: 'c'|'e';
}

export function newDefaultUserDeviceSettings(): UserDeviceSettings {
  return {
    songFontSize: getDefaultUserSongFontSize(),
    tunerRepeatMode: false,
    tunerToneType: 'c',
  };
}

/** User settings stored on the server. */
export interface UserSettings {
  /** User mount value. Can only be used for signed in users. */
  readonly mount: string,
  readonly songs: { [songId: number]: UserSongSettings },
  /** If true => B will be rendered instead of H for the tone Si. */
  readonly b4Si?: boolean,
}

/** Per song settings. */
export interface UserSongSettings {
  readonly songId: number;
  readonly transpose: number;
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

export function getDefaultUserSongFontSize(): number {
  const width = window && window.innerWidth;
  return !width || (width >= MIN_DESKTOP_WIDTH && width < HIRES_DESKTOP_WIDTH)
      ? SONG_FONT_SIZE_DESKTOP
      : width < MIN_DESKTOP_WIDTH
          ? SONG_FONT_SIZE_MOBILE
          : SONG_FONT_SIZE_HIRES_DESKTOP;
}


export const MIN_PLAYLIST_NAME_LENGTH = 1;
export const MAX_PLAYLIST_NAME_LENGTH = 100;

export interface Playlist extends WithStringId, Versioned {
  readonly userId: string,
  readonly name: string;
  readonly songIds: readonly number[];
}

