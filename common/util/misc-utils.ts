import {Collection, CollectionType, Song} from '@common/catalog-model';
import {MOUNT_COLLECTION_PREFIX, MOUNT_PRINT_SUFFIX, MOUNT_SONG_PREFIX} from '@common/mounts';
import {map} from 'rxjs/operators';
import {DESKTOP_NAV_HEIGHT, MIN_DESKTOP_WIDTH, MOBILE_NAV_HEIGHT} from '@common/common-constants';
import {combineLatest, Observable, of} from 'rxjs';
import {User, UserGroup} from '@common/user-model';
import {fromPromise} from 'rxjs/internal-compatibility';

export function toArrayOfInts(text: string, sep: string): number[] {
  if (!text || text.length === 0) {
    return [];
  }
  return text.split(sep).map(v => +v);
}

export function isEqualByStringify(oldValue: any|undefined, newValue: any|undefined): boolean {
  if (oldValue === newValue) {
    return true;
  }
  if (oldValue === undefined || newValue === undefined) {
    return false;
  }
  return JSON.stringify(oldValue) === JSON.stringify(newValue);
}

/** Returns true if arrays are equal. */
export function isEqualByShallowArrayCompare(a1?: readonly any[], a2?: readonly any[]): boolean {
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

export function isValidId(id: number|undefined): id is number {
  return id !== undefined && id > 0;
}

export function isValidUserId(id: string|undefined): id is string {
  return !!id && id.length > 0;
}

export function getNameFirstFormArtistName(collection: { type: CollectionType, name: string }): string {
  if (collection.type !== CollectionType.Person) {
    return collection.name;
  }
  const sepIdx = collection.name.indexOf(' ');
  return sepIdx > 0 ? collection.name.substring(sepIdx + 1) + ' ' + collection.name.substring(0, sepIdx) : collection.name;
}

export function hasValidForumTopic(song?: Song): song is Song {
  return song !== undefined && isValidId(song.tid);
}

export function getCollectionPageLink(collectionOrMount: string|{ mount: string }): string {
  const mount = typeof collectionOrMount === 'string' ? collectionOrMount : collectionOrMount.mount;
  return `/${MOUNT_COLLECTION_PREFIX}${mount}`;
}

export function getSongPageLink(collectionMount: string, songMount: string, primaryCollectionMount?: string): string {
  if (!!primaryCollectionMount && primaryCollectionMount !== collectionMount) {
    return `/${MOUNT_SONG_PREFIX}${collectionMount}/${songMount}/${primaryCollectionMount}`;
  }
  return `/${MOUNT_SONG_PREFIX}${collectionMount}/${songMount}`;
}

export function getSongPrintPageLink(collectionMount: string, songMount: string): string {
  return `/${MOUNT_SONG_PREFIX}${collectionMount}/${songMount}/${MOUNT_PRINT_SUFFIX}`;
}

/**
 *  Returns true if userAgent is a known mobile (small screen) device user agent.
 *  Used in server side rendering to select correct layout (when needed) to avoid flickering on re-render on the client.
 *  Example: columns count on the song page.
 */
export function isSmallScreenDevice(userAgent?: string): boolean {
  return userAgent != undefined && !!userAgent.match(/(android.*mobile|iphone|ipod|ipad|blackberry|iemobile|opera (mini|mobi))/i);
}

/** Accepts 1 argument and returns true if the argument !== undefined. */
export function defined<T>(v: T|undefined): v is T {
  return v !== undefined;
}

export function firstInArray<T>(v: T[]|undefined): T|undefined {
  return v && v.length > 0 ? v[0] : undefined;
}

/** RxJS wrapper to get only 1st element of the array. */
export const mapToFirstInArray = map(firstInArray);

/**
 * RxJS wrapper over Rx.combineLatest with a specific handling of an empty input arrays:
 *  when empty array or observables is given as an input it will emit an empty array of values before completion.
 */
export function combineLatest0<T>(array: Observable<T>[]): Observable<T[]> {
  const result$ = array.length === 0 ? of([]) : combineLatest(array);
  return result$ as any as Observable<T[]>;
}

export function countOccurrences(text: string, token: string): number {
  let hits = 0;
  for (let idx = 0; idx < text.length - token.length;) {
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


export function scrollToView(element?: HTMLElement): void {
  if (!element) {
    return;
  }
  const headerHeight = window.innerWidth >= MIN_DESKTOP_WIDTH ? DESKTOP_NAV_HEIGHT + 10 : MOBILE_NAV_HEIGHT + 5;
  window.scroll({left: window.scrollX, top: element.offsetTop - headerHeight, behavior: 'smooth'});
}

export function canManageCollectionContent(user: User|undefined, collection: Collection): user is User {
  if (!!user && user.groups.includes(UserGroup.Moderator)) {
    return true;
  }
  if (!user || !collection.userId) {
    return false;
  }
  return collection.userId === user.id;
}

export function canRemoveCollection(user: User|undefined, collection: Collection): user is User {
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

export function canCreateNewPublicCollection(user: User|undefined): boolean {
  return !!user && (user.groups.includes(UserGroup.Moderator));
}

export function waitForAllPromisesAndReturnFirstArg<T>(first: T, promises: Promise<unknown>[]): Observable<T> {
  const first$ = of(first);
  if (promises.length === 0) {
    return first$;
  }
  return combineLatest([first$, ...promises.map(p => fromPromise(p))])
      .pipe(map(arr => arr[0] as T));
}

export function isTouchEventsSupportAvailable(): boolean {
  return document && 'ontouchstart' in document.documentElement;
}

export function sortSongsAlphabetically(songs: Song[]): Song[] {
  return songs.sort((s1, s2) => s1.title.localeCompare(s2.title));
}

export function trackById(idx: number, entity: { id: number|string }): number|string {
  return entity.id;
}

/** Returns true if the element is input element: <textarea> or <input>. */
export function isInputEvent(event: KeyboardEvent): boolean {
  return isInputElement(event.target as HTMLElement);
}

/** Returns true if the element is input element: <textarea> or <input>. */
export function isInputElement(element: HTMLElement|undefined): boolean {
  const tagName = element ? element.tagName.toLowerCase() : '';
  return tagName === 'textarea' || tagName === 'input';
}
