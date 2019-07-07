import {Versioned, WithStringId} from '@common/common-model';
import {HIRES_DESKTOP_WIDTH, MIN_DESKTOP_WIDTH} from '@common/constants';

export const USERS_STORE_SCHEMA_VERSION = 3;

export enum UserGroup {
  Moderator = 'moderator',
}

export interface User {
  /** Unique user identifier. Shared with NodeBB server (forum).*/
  readonly id: string;
  /** Username (login). Shared with NodeBB server (forum). */
  readonly username: string;
  /** User email. */
  readonly email: string;
  /** Full avatar URL. */
  readonly picture: string;
  /** List of user groups. */
  readonly groups: UserGroup[];
}


/** 'c' for Classic, 'e' for Electro. */
export type TunerToneType = 'c'|'e';

/**
 * Settings that stored in the browser and never saved on server.
 * Usually these settings are different per device. Example: font sizes.
 */
export interface UserDeviceSettings {
  /** Font size in pixels. */
  readonly songFontSize: number;
  /** If true -> repeat mode is checked by default in tuner. */
  readonly tunerRepeatMode: boolean;
  readonly tunerToneType: TunerToneType;
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
  readonly songs: { readonly [songId: number]: UserSongSettings },
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

