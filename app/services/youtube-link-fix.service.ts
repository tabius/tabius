import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { GetYoutubeLinkFixQueueResponse, YoutubeLinkFixActionResponse } from '@common/api-model';

/** Client for the moderator-only broken-YouTube-link review queue (/api/youtube-fix). */
@Injectable({ providedIn: 'root' })
export class YoutubeLinkFixService {
  private readonly httpClient = inject(HttpClient);

  getQueue(page: number): Promise<GetYoutubeLinkFixQueueResponse> {
    return firstValueFrom(this.httpClient.get<GetYoutubeLinkFixQueueResponse>(`/api/youtube-fix/queue?page=${page}`));
  }

  /** Approves a candidate: replaces the broken link in the song. `videoId` may be an id or a URL. */
  approve(id: number, videoId: string): Promise<YoutubeLinkFixActionResponse> {
    return firstValueFrom(this.httpClient.post<YoutubeLinkFixActionResponse>('/api/youtube-fix/approve', { id, videoId }));
  }

  /** Removes the item from the queue until the next sweep (re-searched after the cool-down). */
  skip(id: number): Promise<YoutubeLinkFixActionResponse> {
    return firstValueFrom(this.httpClient.post<YoutubeLinkFixActionResponse>('/api/youtube-fix/skip', { id }));
  }
}
