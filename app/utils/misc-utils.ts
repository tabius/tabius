import {
  DESKTOP_LOW_HEIGHT_NAV_HEIGHT,
  DESKTOP_NAV_HEIGHT,
  HIRES_DESKTOP_HEIGHT,
  HIRES_DESKTOP_WIDTH,
  MIN_DESKTOP_WIDTH,
  MOBILE_NAV_HEIGHT,
} from '@common/common-constants';
import { UserDeviceSettings } from '@common/user-model';

export const isBrowser: boolean = typeof window === 'object';

const SONG_FONT_SIZE_MOBILE = 16;
const SONG_FONT_SIZE_DESKTOP = 18;
const SONG_FONT_SIZE_HIRES_DESKTOP = 20;

export function getDefaultUserSongFontSize(): number {
  const width = typeof window === 'object' && window.innerWidth;
  return !width || (width >= MIN_DESKTOP_WIDTH && width < HIRES_DESKTOP_WIDTH)
    ? SONG_FONT_SIZE_DESKTOP
    : width < MIN_DESKTOP_WIDTH
      ? SONG_FONT_SIZE_MOBILE
      : SONG_FONT_SIZE_HIRES_DESKTOP;
}

export function newDefaultUserDeviceSettings(): UserDeviceSettings {
  return {
    songFontSize: getDefaultUserSongFontSize(),
    tunerRepeatMode: false,
    tunerToneType: 'c',
  };
}

export function scrollToView(element: HTMLElement | undefined, paddingTop = 0): void {
  if (!element) {
    return;
  }
  window.scroll({ left: window.scrollX, top: element.offsetTop - getCurrentNavbarHeight() - paddingTop, behavior: 'smooth' });
}

// noinspection JSUnusedGlobalSymbols
export function scrollToViewByEndPos(element: HTMLElement | undefined, paddingBottom = 0): void {
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

export function isTouchDevice(): boolean {
  return typeof document === 'object' && 'ontouchstart' in document.documentElement;
}

/** Returns true if the element is input element: <textarea> or <input>. */
export function isInputEvent(event: KeyboardEvent): boolean {
  return isElementToIgnoreKeyEvent(event.target as HTMLElement);
}

/** Returns true if the element is input element: <textarea> or <input>. */
export function isElementToIgnoreKeyEvent(element: HTMLElement | undefined): boolean {
  const tagName = element ? element.tagName.toLowerCase() : '';
  return tagName === 'textarea' || (tagName === 'input' && element?.getAttribute('type') !== 'checkbox');
}

export function getCurrentNavbarHeight(): number {
  return window.innerWidth >= MIN_DESKTOP_WIDTH
    ? window.innerHeight < HIRES_DESKTOP_HEIGHT
      ? DESKTOP_LOW_HEIGHT_NAV_HEIGHT
      : DESKTOP_NAV_HEIGHT
    : MOBILE_NAV_HEIGHT;
}

export function findParentOrSelfWithClass(el: Element | undefined | null, className: string): Element | undefined {
  if (!el) {
    return undefined;
  }
  if (el.classList.contains(className)) {
    return el;
  }
  return findParentOrSelfWithClass(el.parentElement, className);
}
