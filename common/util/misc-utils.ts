import { Collection, CollectionType, Song } from '@common/catalog-model';
import { MOUNT_COLLECTION_PREFIX, MOUNT_PRINT_SUFFIX, MOUNT_SONG_PREFIX } from '@common/mounts';
import { map } from 'rxjs/operators';
import { combineLatest, from, Observable, of } from 'rxjs';
import { User } from '@common/user-model';
import type { Request } from 'express';

export function toArrayOfInts(text: string, sep: string): number[] {
  if (!text || text.length === 0) {
    return [];
  }
  return text.split(sep).map(v => +v);
}

export function isValidId(id: number | undefined): id is number {
  return id !== undefined && id > 0;
}

export function isValidUserId(id: string | undefined): id is string {
  return !!id && id.length > 0;
}

export function getNameFirstFormArtistName(collection: { type: CollectionType; name: string }): string {
  if (collection.type !== CollectionType.Person) {
    return collection.name;
  }
  const sepIdx = collection.name.indexOf(' ');
  return sepIdx > 0 ? collection.name.substring(sepIdx + 1) + ' ' + collection.name.substring(0, sepIdx) : collection.name;
}

export function getCollectionPageLink(collectionOrMount: string | { mount: string }): string {
  const mount = typeof collectionOrMount === 'string' ? collectionOrMount : collectionOrMount.mount;
  return `/${MOUNT_COLLECTION_PREFIX}${mount}`;
}

/** Returns a local song page link. If song-mount is empty, returns prefix of the link. */
export function getSongPageLink(collectionMount: string, songMount: string, primaryCollectionMount?: string): string {
  if (!!primaryCollectionMount && primaryCollectionMount !== collectionMount) {
    return `/${MOUNT_SONG_PREFIX}${collectionMount}/${songMount}/${primaryCollectionMount}`;
  }
  return `/${MOUNT_SONG_PREFIX}${collectionMount}/${songMount}`;
}

export function getSongPrintPageLink(
  collectionMount: string,
  songMount: string,
  primaryCollectionMount: string | undefined,
): string {
  return collectionMount === primaryCollectionMount || primaryCollectionMount === undefined
    ? `/${MOUNT_SONG_PREFIX}${collectionMount}/${songMount}/${collectionMount}/${MOUNT_PRINT_SUFFIX}`
    : `/${MOUNT_SONG_PREFIX}${collectionMount}/${songMount}/${primaryCollectionMount}/${MOUNT_PRINT_SUFFIX}`;
}

/**
 *  Returns true if userAgent is a known mobile (small screen) device user agent.
 *  Used in server side rendering to select correct layout (when needed) to avoid flickering on re-render on the client.
 *  Example: columns count on the song page.
 */
export function isSmallScreenDevice(userAgent?: string): boolean {
  return userAgent !== undefined && !!userAgent.match(/(android.*mobile|iphone|ipod|ipad|blackberry|iemobile|opera (mini|mobi))/i);
}

/** Accepts 1 argument and returns true if the argument !== undefined. */
export function isDefined<T>(v: T | undefined): v is T {
  return v !== undefined;
}

export function firstInArray<T>(v: T[] | undefined): T | undefined {
  return v && v.length > 0 ? v[0] : undefined;
}

/** RxJS wrapper to get only 1st element of the array. */
export const mapToFirstInArray = map(firstInArray);

/**
 * RxJS wrapper over Rx.combineLatest with a specific handling of an empty input arrays:
 *  when an empty array or observables is given as an input, it will emit an empty array of values before completion.
 */
export function combineLatest0<T>(array: Observable<T>[]): Observable<T[]> {
  const result$ = array.length === 0 ? of([]) : combineLatest(array);
  return result$ as any as Observable<T[]>;
}

export function countOccurrences(text: string, token: string): number {
  let hits = 0;
  for (let idx = 0; idx < text.length - token.length; ) {
    const matchIdx = text.indexOf(token, idx);
    if (matchIdx === -1) {
      break;
    }
    hits++;
    idx = matchIdx + token.length;
  }
  return hits;
}

export function bound(min: number, value: number, max: number): number {
  return value <= min ? min : value >= max ? max : value;
}

export function canManageCollectionContent(user: User | undefined, collection: Collection): user is User {
  if (isModerator(user)) {
    return true;
  }
  if (!user || !collection.userId) {
    return false;
  }
  return collection.userId === user.id;
}

export function canRemoveCollection(user: User | undefined, collection: Collection): user is User {
  if (!canManageCollectionContent(user, collection)) {
    return false;
  }
  if (user.collectionId === collection.id) {
    // Can't remove primary collection.
    return false;
  }
  // Collection removal from public catalog (userId === undefined) is not supported.
  return !!collection.userId;
}

/** Returns true if the user has 'moderator' role. */
export function isModerator(user: User | undefined): boolean {
  return !!user && user.roles && user.roles.includes('moderator');
}

export function canCreateNewPublicCollection(user: User | undefined): boolean {
  return isModerator(user);
}

export function waitForAllPromisesAndReturnFirstArg<T>(first: T, promises: Promise<unknown>[]): Observable<T> {
  const first$ = of(first);
  if (promises.length === 0) {
    return first$;
  }
  return combineLatest([first$, ...promises.map(p => from(p))]).pipe(map(arr => arr[0] as T));
}

export function sortSongsAlphabetically(songs: Song[]): Song[] {
  return songs.sort((s1, s2) => (s1.title === s2.title ? (s1.id < s2.id ? -1 : 1) : s1.title.localeCompare(s2.title)));
}

export function trackById<T extends { id: number | string }>(_: number, entity: T): number | string {
  return entity.id;
}

export function trackByUrl<T extends { url: string }>(_: number, entity: T): number | string {
  return entity.url;
}

const ALPHA_EN = /^[A-Z]+$/i;
const ALPHA_RU = /^[А-ЯЁ]+$/i;
const DIGIT = /^\d$/;

export function isAlpha(char: string): boolean {
  return ALPHA_EN.test(char) || ALPHA_RU.test(char);
}

export function isDigit(char: string): boolean {
  return DIGIT.test(char);
}

/** Converts user input into Sphinx safe search text. */
export function toSafeSearchText(text: string): string {
  let safeText = '';
  for (const c of text) {
    if (isAlpha(c) || isDigit(c)) {
      safeText += c;
    } else if (!safeText.endsWith(' ')) {
      safeText += ' ';
    }
  }
  return safeText.trim();
}

/** Returns true if userAgent string is bot. */
export function isBotUserAgent(userAgent: string | undefined): boolean {
  return !!userAgent && /bot|googlebot|crawler|spider|robot|crawling|lighthouse/i.test(userAgent);
}

export function getUserAgentFromRequest(request: Request): string | undefined {
  return request && request.headers ? request.headers['user-agent'] : undefined;
}

export function nothingThen(): void {}
