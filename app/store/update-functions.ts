import {isEqualByShallowArrayCompare, isEqualByStringify} from './equality-functions';

export interface Versioned {
  readonly version: number;
}

// noinspection JSUnusedGlobalSymbols
/** A predefined and easy to read constant for 'no-prefetch' mode. */
export const DO_NOT_PREFETCH = undefined;

/** Returns true if update is needed. */
export function checkUpdateByVersion(oldValue: Versioned|undefined, newValue: Versioned|undefined): boolean {
  if (oldValue === newValue) {
    return false;
  }
  if (oldValue === undefined || newValue === undefined) {
    return true;
  }
  return newValue.version > oldValue.version;
}

export function checkUpdateByShallowArrayCompare(oldValue: readonly any[]|undefined, newValue: readonly any[]|undefined): boolean {
  return !isEqualByShallowArrayCompare(oldValue, newValue);
}

export function checkUpdateByStringify(oldValue: any|undefined, newValue: any|undefined): boolean {
  return !isEqualByStringify(oldValue, newValue);
}

export function checkUpdateByReference(oldValue: any|undefined, newValue: any|undefined): boolean {
  return newValue !== oldValue;
}
