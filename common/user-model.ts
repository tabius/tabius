import {HIRES_DESKTOP_WIDTH, MIN_DESKTOP_WIDTH} from '@common/common-constants';
import {ChordTone} from '@app/utils/chords-lib';

/** The only role we have today. Can add new collections and songs. */
export type UserRole = 'moderator'

export interface User {
  /** Unique user identifier provided by Auth0. 'sub' field in Auth0 profile. */
  id: string;
  /** User nickname. Provided by auth0. */
  nickname: string;
  /** User email. */
  email: string;
  /** Full avatar URL. */
  picture: string;
  /** List of user roles. */
  roles: Array<UserRole>;
  /** Default collection associated with the user. */
  collectionId: number;
  /** Mount used for all user resources. */
  mount: string;
}


/** 'c' for Classic, 'e' for Electro. */
export type TunerToneType = 'c'|'e';

/**
 * Settings that stored in the browser and never saved on server.
 * Usually these settings are different per device. Example: font sizes.
 */
export interface UserDeviceSettings {
  /** Font size in pixels. */
  songFontSize: number;
  /** If true -> repeat mode is checked by default in tuner. */
  tunerRepeatMode: boolean;
  tunerToneType: TunerToneType;
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
  songs: { readonly [songId: number]: UserSongSettings },

  /** If true => 'B' will be rendered as 'H' for the tone Si. */
  h4Si: boolean,

  /** Favorite minor key. Default: 'Am'. */
  favKey: ChordTone;

}

/** Per song settings. */
export interface UserSongSettings {
  songId: number;
  transpose: number;
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

export interface CatalogNavigationHistory {
  steps: CatalogNavigationHistoryStep[];
}

export interface CatalogNavigationHistoryStep {
  name: string;
  url: string;
}

export function newEmptyCatalogNavigationHistory(): CatalogNavigationHistory {
  return {
    steps: [],
  };
}
