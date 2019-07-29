import {isValidId} from '@common/util/misc-utils';
import {MAX_PLAYLIST_NAME_LENGTH, MIN_PLAYLIST_NAME_LENGTH, Playlist, UserSongSettings} from '@common/user-model';
import {eachItem, equals, isArray, isBoolean, isNumber, isString, maxLength, min, minLength, Validator} from 'typed-validation';
import {CreatePlaylistRequest} from '@common/ajax-model';
import {MAX_ARTIST_MOUNT_LENGTH, MAX_SONG_CONTENT_LENGTH, MAX_SONG_MOUNT_LENGTH, MAX_SONG_TITLE_LENGTH, MIN_ARTIST_MOUNT_LENGTH, MIN_SONG_CONTENT_LENGTH, MIN_SONG_MOUNT_LENGTH, MIN_SONG_TITLE_LENGTH, Song, SongDetails} from '@common/artist-model';
import {INVALID_ID} from '@common/constants';

export function paramToId(value: string): number {
  const id = +value;
  if (!isValidId(id)) {
    throw Error(`Invalid id: ${value}`);
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

export const isVersion = () => min(0);
export const isNumericId = () => min(1);
export const checkStringLength = (minLen: number, maxLen: number) => isString(minLength(minLen, maxLength(maxLen)));
export const isUserId = () => checkStringLength(1, 40);
export const isSongMount = () => checkStringLength(MIN_SONG_MOUNT_LENGTH, MAX_SONG_MOUNT_LENGTH);
export const isArtistMount = () => checkStringLength(MIN_ARTIST_MOUNT_LENGTH, MAX_ARTIST_MOUNT_LENGTH);

export const PlaylistValidator: Validator<Playlist> = {
  id: isNumericId(),
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

export const SongValidator: Validator<Song> = {
  id: isNumericId(),
  version: isVersion(),
  title: checkStringLength(MIN_SONG_TITLE_LENGTH, MAX_SONG_TITLE_LENGTH),
  mount: isSongMount(),
  artistId: isNumericId(),
  tid: min(INVALID_ID), // song may have no valid topic ID.
};

export const NewSongValidator: Validator<Song> = {
  ...SongValidator,
  id: equals(INVALID_ID),
  version: equals(0),
  mount: equals(''),
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
