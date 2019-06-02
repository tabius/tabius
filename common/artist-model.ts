import {Versioned, WithId} from '@common/common-model';

export const ARTISTS_STORE_SCHEMA_VERSION = 3;

export enum ArtistType {
  Person = 1,
  Band = 2
}

export interface Artist extends WithId, Versioned {
  name: string;
  mount: string;
  type: ArtistType;
  //todo: make optional or move to details?
  bandIds: number[];
}

export interface ArtistDetails extends WithId, Versioned {
  songIds: number[];
}

export interface Song extends WithId, Versioned {
  mount: string;
  title: string;
  artistId: number;
}

export interface SongDetails extends WithId, Versioned {
  content: string;
  mediaLinks: string[];
}
