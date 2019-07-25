import {Versioned, WithId} from '@common/common-model';

export const ARTISTS_STORE_SCHEMA_VERSION = 3;

export enum ArtistType {
  Person = 1,
  Band = 2
}

export interface Artist extends WithId, Versioned {
  /** Name of the artist. For person it is <Last Name> <First Name>. */
  readonly name: string;
  /** Mount part of the artist page. Unique for all artists. */
  readonly mount: string;
  /** Type of the artist: Band or Person. */
  readonly type: ArtistType;
}

export interface ArtistDetails extends WithId, Versioned {
  /** List of artist's band ids.*/
  readonly bandIds: readonly number[];
  readonly listed: boolean;
}

export const MIN_SONG_TITLE_LENGTH = 1;
export const MAX_SONG_TITLE_LENGTH = 200;

export interface Song extends WithId, Versioned {
  /** Mount part of the song page. Unique for all songs per artist. */
  readonly mount: string;
  /** Title of the song. */
  readonly title: string;
  /** Performer. */
  readonly artistId: number;
  /** Forum topic id.*/
  readonly tid: number;
}

export const MIN_SONG_CONTENT_LENGTH = 10;
export const MAX_SONG_CONTENT_LENGTH = 10000;

export interface SongDetails extends WithId, Versioned {
  /** Text of the song with tabs & chords. */
  readonly content: string;
  /** List of media links: Youtube, etc...*/
  readonly mediaLinks: string[];
}
