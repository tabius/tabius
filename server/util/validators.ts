import {isValidId} from '@common/util/misc-utils';
import {MAX_PLAYLIST_NAME_LENGTH, MIN_PLAYLIST_NAME_LENGTH, Playlist, UserSongSettings} from '@common/user-model';
import {eachItem, isArray, isBoolean, isNumber, isString, maxLength, min, minLength, Validator} from 'typed-validation';
import {CreatePlaylistRequest} from '@common/ajax-model';
import {SongDetails} from '@common/artist-model';

/**
 * Converts strings with a comma-separated numbers to an array of numbers or throws error.
 * The returned array will have length > 0.
 */
export function stringToArrayOfNumericIds(text: unknown): number[] {
  if (typeof text !== 'string') {
    throw new Error(`Value is not a string: ${text}`);
  }
  const result: number[] = [];
  for (const token of text.split(',')) {
    const id = +token;
    if (!isValidId(id)) {
      throw Error(`Invalid id: ${token}`);
    }
    result.push(id);
  }
  return result;
}

export const isVersion = () => min(0);
export const isNumericId = () => min(1);
export const checkStringLength = (minLen: number, maxLen: number) => isString(minLength(minLen, maxLength(maxLen)));
export const isUserId = () => checkStringLength(1, 40);

export const PlaylistValidator: Validator<Playlist> = {
  id: checkStringLength(1, 16),
  version: isVersion(),
  userId: isUserId(),
  name: checkStringLength(MIN_PLAYLIST_NAME_LENGTH, MAX_PLAYLIST_NAME_LENGTH),
  songIds: isArray(eachItem(isNumericId())),
};

export const CreatePlaylistRequestValidator: Validator<CreatePlaylistRequest> = {
  name: minLength(1),
  shared: isBoolean(),
  songIds: isArray(eachItem(isNumericId())),
};

export const UserSongSettingsValidator: Validator<UserSongSettings> = {
  songId: isNumericId(),
  transpose: isNumber(),
  hideChords: isBoolean(),
};

export const SongDetailsValidator: Validator<SongDetails> = {
  id: isNumericId(),
  version: isVersion(),
  content: checkStringLength(10, 10000),
  mediaLinks: isArray(eachItem(isString())),
};
