import {Versioned} from '@common/common-model';
import {ArtistType, Song} from '@common/artist-model';
import {FORUM_LINK, MOUNT_ARTIST_PREFIX, MOUNT_PLAYLIST_PREFIX, MOUNT_SONG_PREFIX} from '@common/mounts';
import {filter} from 'rxjs/operators';
import {DESKTOP_NAV_HEIGHT, MIN_DESKTOP_WIDTH, MOBILE_NAV_HEIGHT} from '@common/constants';

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

export function getPlaylistPageLink(playlistId: string): string {
  return `/${MOUNT_PLAYLIST_PREFIX}${playlistId}`;
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

/** RxJS wrapper to keep only defined elements in the stream. */
export const keepDefined = filter(defined);

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
