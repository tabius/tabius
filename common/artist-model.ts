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
  /** List of artist's band ids.*/
  //todo: make optional or move to details?
  readonly bandIds: readonly number[];
}

export interface ArtistDetails extends WithId, Versioned {
  readonly songIds: readonly number[];
}

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

export interface SongDetails extends WithId, Versioned {
  /** Text of the song with tabs & chords. */
  readonly content: string;
  /** List of media links: Youtube, etc...*/
  readonly mediaLinks: string[];
}
