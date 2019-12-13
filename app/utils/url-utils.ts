import {environment} from '@app/environments/environment';
import {Song} from '@common/catalog-model';
import {hasValidForumTopic} from '@common/util/misc-utils';
import {NODE_BB_URL} from '@app/app-constants';

export function getCollectionImageUrl(mount: string): string {
  return `${environment.backendUrl}/images/collection/profile/${mount}.jpg`;
}

export function getSongForumTopicLink(song?: Song): string {
  if (!hasValidForumTopic(song)) {
    return '#';
  }
  return `${NODE_BB_URL}/topic/${song.tid}`;
}

