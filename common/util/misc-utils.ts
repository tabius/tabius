import {Versioned} from '@common/common-model';
import {ArtistType, Song} from '@common/artist-model';
import {FORUM_LINK, MOUNT_ARTIST_PREFIX, MOUNT_PLAYLIST_PREFIX, MOUNT_SONG_PREFIX} from '@common/mounts';
import {map} from 'rxjs/operators';
import {DESKTOP_NAV_HEIGHT, MIN_DESKTOP_WIDTH, MOBILE_NAV_HEIGHT} from '@common/constants';
import {combineLatest, Observable, of} from 'rxjs';
import {User, UserGroup} from '@common/user-model';
import Hashids from 'hashids';
import {fromPromise} from 'rxjs/internal-compatibility';

export function toArrayOfInts(text: string, sep: string): number[] {
  if (!text || text.length == 0) {
    return [];
  }
  return text.split(sep).map(v => +v);
}

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
  return !shallowArraysEquals(oldValue, newValue);
}

export function checkUpdateByStringify(oldValue: any|undefined, newValue: any|undefined): boolean {
  if (oldValue === newValue) {
    return false;
  }
  if (oldValue === undefined || newValue === undefined) {
    return true;
  }
  return JSON.stringify(oldValue) !== JSON.stringify(newValue);
}

export function checkUpdateByReference(oldValue: any|undefined, newValue: any|undefined): boolean {
  return newValue !== oldValue;
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

export function isValidId(id: number|undefined): id is number {
  return id !== undefined && id > 0;
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

export function hasValidForumTopic(song?: Song): song is Song {
  return song !== undefined && isValidId(song.tid);
}

export function getSongForumTopicLink(song?: Song): string {
  if (!hasValidForumTopic(song)) {
    return '#';
  }
  return FORUM_LINK + '/topic/' + song.tid;
}

export function getArtistPageLink(artistMount: string): string {
  return `/${MOUNT_ARTIST_PREFIX}${artistMount}`;
}

export function getSongPageLink(artistMount: string, songMount: string): string {
  return `/${MOUNT_SONG_PREFIX}${artistMount}/${songMount}`;
}

export function getPlaylistPageLink(playlistId: number): string {
  return `/${MOUNT_PLAYLIST_PREFIX}${playlistIdToMount(playlistId)}`;
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

export function canEditArtist(user: User|undefined, artistId: number): boolean {
  return !!user && (user.groups.includes(UserGroup.Moderator) || user.artistId === artistId);
}

const playlistHashIds = new Hashids('salt', 5);

export function playlistIdToMount(playlistId: number): string {
  return playlistHashIds.encode(playlistId);
}

export function playlistMountToId(mount: string): number|undefined {
  const ids = playlistHashIds.decode(mount);
  return ids && ids.length == 1 ? ids[0] : undefined;
}

export function waitForAllPromisesAndReturnFirstArg<T>(first: T, promises: Promise<unknown>[]): Observable<T> {
  const first$ = of(first);
  if (promises.length == 0) {
    return first$;
  }
  return combineLatest([first$, ...promises.map(p => fromPromise(p))])
      .pipe(map(arr => arr[0] as T));
}

