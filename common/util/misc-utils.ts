import {Collection, CollectionType, Song} from '@common/catalog-model';
import {MOUNT_COLLECTION_PREFIX, MOUNT_PRINT_SUFFIX, MOUNT_SONG_PREFIX} from '@common/mounts';
import {map} from 'rxjs/operators';
import {DESKTOP_LOW_HEIGHT_NAV_HEIGHT, DESKTOP_NAV_HEIGHT, HIRES_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MOBILE_NAV_HEIGHT} from '@common/common-constants';
import {combineLatest, from, Observable, of} from 'rxjs';
import {User} from '@common/user-model';
import {environment} from '@app/environments/environment';
import {TELEGRAM_CHANNEL_URL} from '@app/app-constants';

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

export function getCollectionPageLink(collectionOrMount: string|{ mount: string }): string {
  const mount = typeof collectionOrMount === 'string' ? collectionOrMount : collectionOrMount.mount;
  return `/${MOUNT_COLLECTION_PREFIX}${mount}`;
}

/** Returns local song page link. If song-mount is empty, returns prefix of the link. */
export function getSongPageLink(collectionMount: string, songMount: string, primaryCollectionMount?: string): string {
  if (!!primaryCollectionMount && primaryCollectionMount !== collectionMount) {
    return `/${MOUNT_SONG_PREFIX}${collectionMount}/${songMount}/${primaryCollectionMount}`;
  }
  return `/${MOUNT_SONG_PREFIX}${collectionMount}/${songMount}`;
}

export function getSongPrintPageLink(collectionMount: string, songMount: string): string {
  return `/${MOUNT_SONG_PREFIX}${collectionMount}/${songMount}/${MOUNT_PRINT_SUFFIX}`;
}

export function getFullLink(localLink: string): string {
  return environment.url + localLink;
}

export function getChordsDiscussionUrl(): string {
  return TELEGRAM_CHANNEL_URL;
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

export function scrollToView(element: HTMLElement|undefined, paddingTop = 0): void {
  if (!element) {
    return;
  }
  window.scroll({left: window.scrollX, top: element.offsetTop - getCurrentNavbarHeight() - paddingTop, behavior: 'smooth'});
}

// noinspection JSUnusedGlobalSymbols
export function scrollToViewByEndPos(element: HTMLElement|undefined, paddingBottom = 0): void {
  if (!element) {
    return;
  }
  const footerHeight = 42;
  const headerHeight = getCurrentNavbarHeight();
  const visibleHeight = window.innerHeight - headerHeight - footerHeight - paddingBottom;
  const elementRect = element.getBoundingClientRect();
  const elementHeightToShow = Math.min(elementRect.height, visibleHeight);
  scrollToView(element, -(elementRect.height - elementHeightToShow));
}

export function canManageCollectionContent(user: User|undefined, collection: Collection): user is User {
  if (isModerator(user)) {
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

/** Returns true if the user has 'moderator' role. */
export function isModerator(user: User|undefined): boolean {
  return !!user && user.roles && user.roles.includes('moderator');
}

export function canCreateNewPublicCollection(user: User|undefined): boolean {
  return isModerator(user);
}

export function waitForAllPromisesAndReturnFirstArg<T>(first: T, promises: Promise<unknown>[]): Observable<T> {
  const first$ = of(first);
  if (promises.length === 0) {
    return first$;
  }
  return combineLatest([first$, ...promises.map(p => from(p))])
      .pipe(map(arr => arr[0] as T));
}

export function isTouchDevice(): boolean {
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
  return isElementToIgnoreKeyEvent(event.target as HTMLElement);
}

/** Returns true if the element is input element: <textarea> or <input>. */
export function isElementToIgnoreKeyEvent(element: HTMLElement|undefined): boolean {
  const tagName = element ? element.tagName.toLowerCase() : '';
  return tagName === 'textarea' || (tagName === 'input' && element!.getAttribute('type') !== 'checkbox');
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

export function getCurrentNavbarHeight(): number {
  return window.innerWidth >= MIN_DESKTOP_WIDTH
         ? window.innerHeight < HIRES_DESKTOP_HEIGHT
           ? DESKTOP_LOW_HEIGHT_NAV_HEIGHT : DESKTOP_NAV_HEIGHT : MOBILE_NAV_HEIGHT;
}

export function findParentOrSelfWithClass(el: Element|undefined|null, className: string): Element|undefined {
  if (!el) {
    return undefined;
  }
  if (el.classList.contains(className)) {
    return el;
  }
  return findParentOrSelfWithClass(el.parentElement, className);
}

/** Returns true if userAgent string is bot. */
export function isBotUserAgent(userAgent: string|undefined): boolean {
  return !!userAgent && /bot|googlebot|crawler|spider|robot|crawling|lighthouse/i.test(userAgent);
}

export function getUserAgentFromRequest(request: any): string|undefined {
  return request && request.headers ? request.headers ['user-agent'] : undefined;
}

export function nothingThen() {
}


export function assertTruthy(value: unknown, error?: string): asserts value {
  value || new Error(error ?? 'Assertion error');
}

export function truthy<T>(value: T, error?: string): NonNullable<T> {
  assertTruthy(value, error);
  return value as NonNullable<T>;
}
