import { ChordTone } from '@common/util/chords-lib';
import { StateRecord } from 'otrie';

/** The only role we have today. Can add new collections and songs. */
export type UserRole = 'moderator';

export interface User {
  /** Unique user identifier provided by Auth0. 'sub' field in Auth0 profile. */
  id: string;
  /** User email. */
  email: string;
  /** List of user roles. */
  roles: Array<UserRole>;
  /** Default collection associated with the user. */
  collectionId: number;
  /** Mount used for all user resources. */
  mount: string;
}

/** 'c' for Classic, 'e' for Electro. */
export type TunerToneType = 'c' | 'e';

/**
 * Settings that stored in the browser and never saved on server.
 * Usually these settings are different per device. Example: font sizes.
 */
export interface UserDeviceSettings extends StateRecord {
  /** Font size in pixels. */
  songFontSize: number;
  /** If true -> repeat mode is checked by default in tuner. */
  tunerRepeatMode: boolean;
  tunerToneType: TunerToneType;
}

/** User settings stored on the server. */
export interface UserSettings {
  /** Per-song settings. */
  songs: { [songId: number]: UserSongSettings };

  /** If true => 'B' will be rendered as 'H' for the tone Si. */
  h4Si: boolean;

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

export interface CatalogNavigationHistory {
  steps: CatalogNavigationHistoryStep[];
}

export interface CatalogNavigationHistoryStep {
  name: string;
  collection?: string;
  url: string;
}

export function newEmptyCatalogNavigationHistory(): CatalogNavigationHistory {
  return {
    steps: [],
  };
}
