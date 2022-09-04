import {environment} from '@app/environments/environment';

export function getCollectionImageUrl(mount: string): string {
  return `${environment.backendUrl}/images/collection/profile/${mount}.jpg`;
}

