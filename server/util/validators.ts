import {isValidId} from '@common/util/misc-utils';
import {UserSongSettings} from '@common/user-model';
import {eachItem, equals, error, isArray, isNumber, isString, maxLength, min, minLength, success, Validator} from 'typed-validation';
import {CreateListedCollectionRequest, CreateUserCollectionRequest, UpdateFavoriteSongKeyRequest} from '@common/ajax-model';
import {CollectionType, MAX_COLLECTION_MOUNT_LENGTH, MAX_COLLECTION_NAME_LENGTH, MAX_SONG_CONTENT_LENGTH, MAX_SONG_MOUNT_LENGTH, MAX_SONG_TITLE_LENGTH, MIN_COLLECTION_MOUNT_LENGTH, MIN_COLLECTION_NAME_LENGTH, MIN_SONG_CONTENT_LENGTH, MIN_SONG_MOUNT_LENGTH, MIN_SONG_TITLE_LENGTH, Song, SongDetails} from '@common/catalog-model';
import {INVALID_ID} from '@common/common-constants';
import {getTranslitLowerCase} from '@common/util/seo-translit';
import {ValidationResult} from 'typed-validation/validation-result';
import {CHORD_TONES} from '@app/utils/chords-lib';

export function paramToId(value: string): number {
  const id = +value;
  if (!isValidId(id)) {
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

const end = (v) => success(v);
type Next<T> = (arg: T) => ValidationResult<T>

export const isVersion = () => min(0);
export const isNumericId = () => min(1);
export const checkStringLength = (minLen: number, maxLen: number, next: Next<string> = end) =>
    isString(minLength(minLen, maxLength(maxLen, next)));
export const isSongMount = () => checkStringLength(MIN_SONG_MOUNT_LENGTH, MAX_SONG_MOUNT_LENGTH, isTranslitLowerCase());
export const isNewSongMount = () => checkStringLength(0, MAX_SONG_MOUNT_LENGTH, isTranslitLowerCase());
export const isCollectionMount = () => checkStringLength(MIN_COLLECTION_MOUNT_LENGTH, MAX_COLLECTION_MOUNT_LENGTH);
export const isCollectionType = () => equals(CollectionType.Band, CollectionType.Person, CollectionType.Compilation);
export const checkChordTone = () => equals(...CHORD_TONES);

export function isTranslitLowerCase(next: Next<string> = end): (arg: string) => ValidationResult<string> {
  return (arg: string): ValidationResult<string> => arg == getTranslitLowerCase(arg) ? next(arg) : error('', '');
}

export const UserSongSettingsValidator: Validator<UserSongSettings> = {
  songId: isNumericId(),
  transpose: isNumber(),
};

export const SongValidator: Validator<Song> = {
  id: isNumericId(),
  version: isVersion(),
  title: checkStringLength(MIN_SONG_TITLE_LENGTH, MAX_SONG_TITLE_LENGTH),
  mount: isSongMount(),
  collectionId: isNumericId(),
  tid: min(INVALID_ID), // song may have no valid topic ID.
};

export const NewSongValidator: Validator<Song> = {
  ...SongValidator,
  id: equals(INVALID_ID),
  version: equals(0),
  mount: isNewSongMount(),
  tid: equals(INVALID_ID),
};

export const SongDetailsValidator: Validator<SongDetails> = {
  id: isNumericId(),
  version: isVersion(),
  content: checkStringLength(MIN_SONG_CONTENT_LENGTH, MAX_SONG_CONTENT_LENGTH),
  mediaLinks: isArray(eachItem(isString())),
};

export const NewSongDetailsValidator: Validator<SongDetails> = {
  ...SongDetailsValidator,
  id: equals(INVALID_ID),
  version: equals(0),
};

export const CreateListedCollectionRequestValidator: Validator<CreateListedCollectionRequest> = {
  mount: isCollectionMount(),
  name: checkStringLength(MIN_COLLECTION_NAME_LENGTH, MAX_COLLECTION_NAME_LENGTH),
  type: isCollectionType(),
};

export const CreateUserCollectionRequestValidator: Validator<CreateUserCollectionRequest> = {
  name: checkStringLength(MIN_COLLECTION_NAME_LENGTH, MAX_COLLECTION_NAME_LENGTH),
};

export const UpdateFavoriteSongKeyValidator: Validator<UpdateFavoriteSongKeyRequest> = {
  key: checkChordTone(),
};
