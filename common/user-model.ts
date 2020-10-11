import {HIRES_DESKTOP_WIDTH, MIN_DESKTOP_WIDTH} from '@common/common-constants';
import {ChordTone} from '@app/utils/chords-lib';

export const USERS_STORE_SCHEMA_VERSION = 3;

export const enum UserGroup {
  /** The only role we have today. Can add new collections and songs. */
  Moderator = 'moderator',
}

export interface User {
  /** Unique user identifier. Shared with NodeBB server (forum). */
  readonly id: string;
  /** Username (login). Shared with NodeBB server (forum). */
  readonly username: string;
  /** User email. */
  readonly email: string;
  /** Full avatar URL. */
  readonly picture: string;
  /** List of user groups. */
  readonly groups: UserGroup[];
  /** Default collection associated with the user. */
  readonly collectionId: number;
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
  /** Per-song settings. */
  readonly songs: { readonly [songId: number]: UserSongSettings },

  /** If true => 'B' will be rendered as 'H' for the tone Si. */
  readonly h4Si: boolean,

  /** Favorite minor key. Default: 'Am'. */
  readonly favKey: ChordTone;

}

/** Per song settings. */
export interface UserSongSettings {
  readonly songId: number;
  readonly transpose: number;
}

export function newDefaultUserSongSettings(songId: number): UserSongSettings {
  return {
    songId,
    transpose: 0,
  };
}

export const DEFAULT_H4SI_FLAG = false;
export const DEFAULT_FAVORITE_KEY: ChordTone = 'A';

export function getDefaultH4SiFlag(): boolean {
  //TODO: make true for RU, make false for ORG.
  return true;
}

export function newDefaultUserSettings(): UserSettings {
  return {
    songs: {},
    h4Si: getDefaultH4SiFlag(),
    favKey: 'A',
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

