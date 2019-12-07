import {Versioned, WithId} from '@common/common-model';

export const CATALOG_STORE_SCHEMA_VERSION = 5;

export enum CollectionType {
  /* Artist, person. Example: Michael Jackson. */
  Person = 1,
  /** Band. Example: Metallica. */
  Band = 2,
  /** Category, genre. Example: Songs from cartoons. */
  Compilation = 3,
}

export function isCompilation(type: CollectionType): boolean {
  return type === CollectionType.Compilation;
}

export function isBand(type: CollectionType): boolean {
  return type === CollectionType.Band;
}

export function isPerson(type: CollectionType): boolean {
  return type === CollectionType.Person;
}

export const MIN_COLLECTION_MOUNT_LENGTH = 1;
export const MAX_COLLECTION_MOUNT_LENGTH = 40;

export const MIN_COLLECTION_NAME_LENGTH = 4;
export const MAX_COLLECTION_NAME_LENGTH = 64;

export interface Collection extends WithId, Versioned {
  /** Name of the collection. For person it is '<Last Name> <First Name>'. */
  readonly name: string;
  /** Mount part of the collection page. Unique for all collections. */
  readonly mount: string;
  /** Type of the collection: Band, Person, Compilation. */
  readonly type: CollectionType;
  /** Collection owner. Undefined for the public catalog collections. */
  readonly userId?: string;
}

export interface CollectionDetails extends WithId, Versioned {
  /** List of artist's band ids. Used only for CollectionType.Person collections. */
  readonly bandIds: readonly number[];
  /** If true, this collection in shown in the public catalog. */
  readonly listed: boolean;
}

export const MIN_SONG_TITLE_LENGTH = 1;
export const MAX_SONG_TITLE_LENGTH = 200;

export const MIN_SONG_MOUNT_LENGTH = 1;
export const MAX_SONG_MOUNT_LENGTH = 64;

export interface Song extends WithId, Versioned {
  /** Mount part of the song page. Unique for all songs per collection. */
  readonly mount: string;
  /** Title of the song. */
  readonly title: string;
  /** Collection. */
  readonly collectionId: number;
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
