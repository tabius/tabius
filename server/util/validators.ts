import {isValidId} from '@common/util/misc_utils';
import {Playlist, User, UserSongSettings} from '@common/user-model';
import {eachItem, error, isArray, isNumber, min, minLength, success, ValidationResult, Validator} from 'typed-validation';
import * as v from 'validator';
import {primitiveType} from 'typed-validation/utils';
import {CreatePlaylistRequest} from '@common/ajax-model';

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

export function isUserId(next?: (arg: any) => ValidationResult<any>): (arg: any) => ValidationResult<any> {
  return (arg: any) => {
    if (typeof arg !== 'string') {
      return error('NOT_USER_ID', `Expected string, got ${primitiveType(arg)}`);
    }
    if (!v.isLength(arg, 10, 40)) {
      return error('NOT_USER_ID', `Illegal user id length: ${arg.length}`);
    }
    return next ? next(arg) : success(arg);
  };
}

export function isUserName(next?: (arg: any) => ValidationResult<any>): (arg: any) => ValidationResult<any> {
  return (arg: any) => {
    if (typeof arg !== 'string') {
      return error('NOT_USER_NAME', `Expected string, got ${primitiveType(arg)}`);
    }
    if (!v.isLength(arg, 1, 100)) {
      return error('NOT_USER_NAME', `Illegal user name length: ${arg.length}`);
    }
    return next ? next(arg) : success(arg);
  };
}

export function isUserPictureUrl(next?: (arg: any) => ValidationResult<any>): (arg: any) => ValidationResult<any> {
  return (arg: any) => {
    if (typeof arg !== 'string') {
      return error('NOT_USER_PICTURE', `Expected string, got ${primitiveType(arg)}`);
    }
    if (!v.isEmpty(arg) && !v.isURL(arg, {protocols: ['https']})) {
      return error('NOT_USER_PICTURE', `Illegal user picture url: ${arg}`);
    }
    return next ? next(arg) : success(arg);
  };
}

export function isEmail(next?: (arg: any) => ValidationResult<any>): (arg: any) => ValidationResult<any> {
  return (arg: any) => {
    if (typeof arg !== 'string') {
      return error('NOT_EMAIL', `Expected string, got ${primitiveType(arg)}`);
    }
    if (!v.isEmail(arg)) {
      return error('NOT_EMAIL', `Illegal user picture url: ${arg}`);
    }
    return next ? next(arg) : success(arg);
  };
}

export const PlaylistValidator: Validator<Playlist> = {
  id: isNumericId(),
  version: isVersion(),
  userId: isUserId(),
  name: minLength(1),
  mount: minLength(1),
  songIds: isArray(eachItem(isNumericId())),
};

export const CreatePlaylistRequestValidator: Validator<CreatePlaylistRequest> = {
  name: minLength(1),
  songIds: isArray(eachItem(isNumericId())),
};

export const UserSongSettingsValidator: Validator<UserSongSettings> = {
  songId: isNumericId(),
  transpose: isNumber(),
};

export const UserValidator: Validator<User> = {
  id: isUserId(),
  name: isUserName(),
  email: isEmail(),
  picture: isUserPictureUrl(),
};
