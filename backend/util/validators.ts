import { UserSongSettings } from '@common/user-model';
import { CreateListedCollectionRequest, CreateUserCollectionRequest, UpdateFavoriteSongKeyRequest } from '@common/api-model';
import {
  CollectionType,
  MAX_COLLECTION_MOUNT_LENGTH,
  MAX_COLLECTION_NAME_LENGTH,
  MAX_SONG_CONTENT_LENGTH,
  MAX_SONG_MOUNT_LENGTH,
  MAX_SONG_TITLE_LENGTH,
  MIN_COLLECTION_MOUNT_LENGTH,
  MIN_COLLECTION_NAME_LENGTH,
  MIN_SONG_CONTENT_LENGTH,
  MIN_SONG_MOUNT_LENGTH,
  MIN_SONG_TITLE_LENGTH,
  Song,
  SongDetails,
} from '@common/catalog-model';
import { INVALID_ID } from '@common/common-constants';
import { getTranslitLowerCase } from '@common/util/seo-translit';
import { CHORD_TONES, ChordTone } from '@common/util/chords-lib';
import { $u, arrayAssertion, assertBoolean, assertString, isNumber, ObjectAssertion, undefinedOr } from 'assertic';

export function paramToId(value: string): number {
  const id = +value;
  if (!isNumericId(id)) {
    throw new Error(`Invalid id: ${value}`);
  }
  return id;
}

/**
 * Converts strings with a comma-separated numbers to an array of numbers or throws error.
 * The returned array will have length > 0.
 */
export function paramToArrayOfNumericIds(value: string): number[] {
  const result: number[] = [];
  for (const token of value.split(',')) {
    const id = paramToId(token);
    result.push(id);
  }
  return result;
}

export function isVersion(value: unknown): value is number {
  return typeof value === 'number' && value >= 0;
}

export function isNumericId(value: unknown): value is number {
  return typeof value === 'number' && value >= 1;
}

export function checkStringLength(value: unknown, minLen: number, maxLen: number): boolean {
  return typeof value === 'string' && value.length >= minLen && value.length <= maxLen;
}

export function isSongMount(value: unknown): boolean {
  return checkStringLength(value, MIN_SONG_MOUNT_LENGTH, MAX_SONG_MOUNT_LENGTH) && isTranslitLowerCase(value);
}

export function isNewSongMount(value: unknown): value is string {
  return checkStringLength(value, 0, MAX_SONG_MOUNT_LENGTH) && isTranslitLowerCase(value);
}

export function isCollectionMount(value: unknown): value is string {
  return checkStringLength(value, MIN_COLLECTION_MOUNT_LENGTH, MAX_COLLECTION_MOUNT_LENGTH);
}

export function isCollectionType(value: unknown): value is CollectionType {
  return value === CollectionType.Band || value === CollectionType.Person || value === CollectionType.Compilation;
}

export function checkChordTone(value: unknown): value is ChordTone {
  return CHORD_TONES.includes(value as ChordTone);
}

export function isTranslitLowerCase(value: unknown): boolean {
  return typeof value === 'string' && value === getTranslitLowerCase(value);
}

export const UserSongSettingsValidator: ObjectAssertion<UserSongSettings> = {
  songId: $u(isSongId),
  transpose: $u(isNumber),
};

export const songAssertion: ObjectAssertion<Song> = {
  id: $u(isNumericId),
  version: $u(isVersion),
  title: $u(v => checkStringLength(v, MIN_SONG_TITLE_LENGTH, MAX_SONG_TITLE_LENGTH)),
  mount: $u(isSongMount),
  collectionId: $u(isNumericId),
};

export const newSongAssertion: ObjectAssertion<Song> = {
  ...songAssertion,
  id: $u(v => v === INVALID_ID),
  version: $u(v => v === 0),
  mount: $u(isNewSongMount),
};

export const songDetailsAssertion: ObjectAssertion<SongDetails> = {
  id: $u(isNumericId),
  version: $u(isVersion),
  content: $u(
    v => checkStringLength(v, MIN_SONG_CONTENT_LENGTH, MAX_SONG_CONTENT_LENGTH),
    () => 'Song content is too short',
  ),
  mediaLinks: arrayAssertion(assertString),
  scene: undefinedOr(assertBoolean),
};

export const newSongDetailsAssertion: ObjectAssertion<SongDetails> = {
  ...songDetailsAssertion,
  id: $u(v => v === INVALID_ID),
  version: $u(v => v === 0),
};

export const createListedCollectionRequestAssertion: ObjectAssertion<CreateListedCollectionRequest> = {
  mount: $u(isCollectionMount),
  name: $u(v => checkStringLength(v, MIN_COLLECTION_NAME_LENGTH, MAX_COLLECTION_NAME_LENGTH)),
  type: $u(isCollectionType),
};

export const createUserCollectionRequestAssertion: ObjectAssertion<CreateUserCollectionRequest> = {
  name: $u(v => checkStringLength(v, MIN_COLLECTION_NAME_LENGTH, MAX_COLLECTION_NAME_LENGTH)),
};

export const updateFavoriteSongKeyRequestAssertion: ObjectAssertion<UpdateFavoriteSongKeyRequest> = {
  key: $u(checkChordTone),
};

export function isSongId(value: unknown): value is number {
  return typeof value === 'number' && value > 0;
}
