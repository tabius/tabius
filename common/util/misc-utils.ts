import {FirebaseUser, User} from '@common/user-model';
import * as admin from 'firebase-admin';
import {Versioned} from '@common/common-model';
import {ArtistType} from '@common/artist-model';
import DecodedIdToken = admin.auth.DecodedIdToken;

export function firebaseUser2User(firebaseUser: FirebaseUser): User {
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || '???',
    email: firebaseUser.email || '???',
    picture: firebaseUser.photoURL || ''
  };
}

export function decodedIdToken2User(token: DecodedIdToken): User {
  return {
    id: token.uid,
    name: token.name,
    email: token.email,
    picture: token.picture
  };
}

export function toArrayOfInts(text: string, sep: string): number[] {
  if (!text || text.length == 0) {
    return [];
  }
  return text.split(sep).map(v => +v);
}

/** Returns true if update is needed. */
export function needUpdateByVersionChange(oldValue?: Versioned, newValue?: Versioned): boolean {
  if (oldValue === newValue) {
    return false;
  }
  if (oldValue === undefined || newValue === undefined) {
    return true;
  }
  return newValue.version > oldValue.version;
}

export function needUpdateByShallowArrayCompare(oldValue?: readonly any[], newValue?: readonly any[]): boolean {
  return !shallowArraysEquals(oldValue, newValue);
}

export function needUpdateByStringify(oldValue?: any, newValue?: any): boolean {
  if (oldValue === newValue) {
    return false;
  }
  if (oldValue === undefined || newValue === undefined) {
    return true;
  }
  return JSON.stringify(oldValue) !== JSON.stringify(newValue);
}

/** Returns true if arrays are equal. */
export function shallowArraysEquals(a1?: readonly any[], a2?: readonly any[]): boolean {
  if (a1 === a2) {
    return true;
  }
  if (a1 === undefined || a2 === undefined) {
    return false;
  }
  if (a1.length !== a2.length) {
    return false;
  }
  for (let i = 0, n = a1.length; i < n; i++) {
    if (a1[i] !== a2[i]) {
      return false;
    }
  }
  return true;
}

export function isValidId(id?: number): id is number {
  return id !== undefined && id > 0;
}

export function isInvalidId(id?: number): id is undefined {
  return !isValidId(id);
}

export function getNameFirstFormArtistName(artist: { type: ArtistType, name: string }): string {
  if (artist.type !== ArtistType.Person) {
    return artist.name;
  }
  const sepIdx = artist.name.indexOf(' ');
  return sepIdx > 0 ? artist.name.substring(sepIdx + 1) + ' ' + artist.name.substring(0, sepIdx) : artist.name;
}

export function getArtistImageUrl(mount: string): string {
  return `https://tabius.ru/images/artists/profile/${mount}.jpg`;
}

