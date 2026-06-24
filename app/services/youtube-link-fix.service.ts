import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { GetYoutubeLinkFixQueueResponse, YoutubeLinkFixActionResponse } from '@common/api-model';

/** Client for the moderator-only broken-YouTube-link review queue (/api/youtube-fix). */
@Injectable({ providedIn: 'root' })
export class YoutubeLinkFixService {
  private readonly httpClient = inject(HttpClient);

  getQueue(): Promise<GetYoutubeLinkFixQueueResponse> {
    return firstValueFrom(this.httpClient.get<GetYoutubeLinkFixQueueResponse>('/api/youtube-fix/queue'));
  }

  /** Approves a candidate: replaces the broken link in the song. `videoId` may be an id or a URL. */
  approve(id: number, videoId: string): Promise<YoutubeLinkFixActionResponse> {
    return firstValueFrom(this.httpClient.post<YoutubeLinkFixActionResponse>('/api/youtube-fix/approve', { id, videoId }));
  }

  /** Rejects all candidates: the item is searched again after the cool-down. */
  reject(id: number): Promise<YoutubeLinkFixActionResponse> {
    return firstValueFrom(this.httpClient.post<YoutubeLinkFixActionResponse>('/api/youtube-fix/reject', { id }));
  }

  /** Dismisses the item permanently. */
  dismiss(id: number): Promise<YoutubeLinkFixActionResponse> {
    return firstValueFrom(this.httpClient.post<YoutubeLinkFixActionResponse>('/api/youtube-fix/dismiss', { id }));
  }
}
