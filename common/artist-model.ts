import {Versioned, WithId} from '@common/common-model';

export const ARTISTS_STORE_SCHEMA_VERSION = 3;

export enum ArtistType {
  Person = 1,
  Band = 2
}

export interface Artist extends WithId, Versioned {
  /** Name of the artist. For person it is <Last Name> <First Name>. */
  name: string;
  /** Mount part of the artist page. Unique for all artists. */
  mount: string;
  /** Type of the artist: Band or Person. */
  type: ArtistType;
  /** List of artist's band ids.*/
  //todo: make optional or move to details?
  bandIds: number[];
}

export interface ArtistDetails extends WithId, Versioned {
  songIds: number[];
}

export interface Song extends WithId, Versioned {
  /** Mount part of the song page. Unique for all songs per artist. */
  mount: string;
  /** Title of the song. */
  title: string;
  /** Performer. */
  artistId: number;
  /** Forum topic id.*/
  tid: number;
}

export interface SongDetails extends WithId, Versioned {
  /** Text of the song with tabs & chords. */
  content: string;
  /** List of media links: Youtube, etc...*/
  mediaLinks: string[];
}
