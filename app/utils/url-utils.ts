import {environment} from '@app/environments/environment';
import {TELEGRAM_CHANNEL_URL} from '@app/app-constants';

export function getCollectionImageUrl(mount: string): string {
  return `${environment.backendUrl}/images/collection/profile/${mount}.jpg`;
}

export function getFullLink(localLink: string): string {
  return environment.url + localLink;
}

export function getChordsDiscussionUrl(): string {
  return TELEGRAM_CHANNEL_URL;
}

