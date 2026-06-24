import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '@app/services/user.service';
import { YoutubeLinkFixService } from '@app/services/youtube-link-fix.service';
import { YoutubeCandidate, YoutubeLinkFixItem } from '@common/api-model';
import { getSongPageLink, isModerator } from '@common/util/misc-utils';

/** Items per page. Must match PAGE_SIZE on the backend (youtube-link-fix.controller.ts). */
const PAGE_SIZE = 10;

/**
 * Moderator-only review queue for broken YouTube links. Lists songs whose video is broken together
 * with the replacement candidates found by scripts/find-youtube-replacements.ts. For each item the
 * moderator can play any candidate embedded inline, compare it against the song text shown on the
 * page, and then approve a replacement (writes it to the song) or skip it (re-searched next sweep).
 *
 * Pagination is server-side (one page fetched at a time) so the page stays fast no matter how large
 * the queue grows. Access is enforced on the backend (every /api/youtube-fix endpoint is
 * moderator-only); this client guard only avoids rendering the page to non-moderators.
 */
@Component({
  templateUrl: './youtube-link-fix-page.component.html',
  styleUrls: ['./youtube-link-fix-page.component.scss'],
  standalone: false,
})
export class YoutubeLinkFixPageComponent {
  private readonly userService = inject(UserService);
  private readonly service = inject(YoutubeLinkFixService);
  private readonly router = inject(Router);

  /** Items of the current page only. */
  readonly items = signal<YoutubeLinkFixItem[]>([]);
  /** Total items across all pages. */
  readonly total = signal(0);
  readonly page = signal(0);
  readonly loaded = signal(false);
  /** Id of the item with an action in flight (disables its buttons). */
  readonly busyId = signal<number | undefined>(undefined);
  /** Per-item custom URL/id typed by the moderator. */
  readonly customUrl: Record<number, string> = {};

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  /** The single candidate currently embedded/playing (only one at a time). */
  private readonly playingVideoId = signal<string | undefined>(undefined);

  readonly getSongPageLink = getSongPageLink;

  private loadStarted = false;

  constructor() {
    this.userService
      .getUser$()
      .pipe(takeUntilDestroyed())
      .subscribe(user => {
        if (user === undefined) {
          return; // Still resolving or logged out — keep showing the loading state.
        }
        if (!isModerator(user)) {
          void this.router.navigate(['/']);
          return;
        }
        if (!this.loadStarted) {
          this.loadStarted = true;
          void this.loadPage(0);
        }
      });
  }

  async loadPage(page: number): Promise<void> {
    const response = await this.service.getQueue(page);
    this.items.set(response.items);
    this.total.set(response.total);
    this.page.set(page);
    this.playingVideoId.set(undefined); // Stop the embedded player from the previous page.
    this.loaded.set(true);
  }

  goToPage(page: number): void {
    const clamped = Math.min(Math.max(0, page), this.totalPages() - 1);
    if (clamped !== this.page()) {
      void this.loadPage(clamped);
      window.scrollTo({ top: 0 });
    }
  }

  thumbnailUrl(videoId: string): string {
    return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
  }

  youtubeUrl(videoId: string): string {
    return `https://youtu.be/${videoId}`;
  }

  embedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  }

  isPlaying(videoId: string): boolean {
    return this.playingVideoId() === videoId;
  }

  /** Plays this candidate, stopping whichever one was playing before. */
  play(videoId: string): void {
    this.playingVideoId.set(videoId);
  }

  /** Whether to show the "almost certainly the right one" badge. */
  isLikely(c: YoutubeCandidate): boolean {
    return (
      c.channelKind === 'topic' ||
      c.channelKind === 'vevo' ||
      (c.channelKind === 'artist' && c.score >= 0.8) ||
      c.score >= 0.85
    );
  }

  async approve(item: YoutubeLinkFixItem, videoId: string | undefined): Promise<void> {
    const value = (videoId || '').trim();
    if (!value) {
      return;
    }
    await this.runAction(item, () => this.service.approve(item.id, value));
  }

  /** Removes the item from the queue until the next sweep. */
  async skip(item: YoutubeLinkFixItem): Promise<void> {
    await this.runAction(item, () => this.service.skip(item.id));
  }

  private async runAction(item: YoutubeLinkFixItem, action: () => Promise<unknown>): Promise<void> {
    if (this.busyId() !== undefined) {
      return;
    }
    this.busyId.set(item.id);
    try {
      await action();
      this.items.update(list => list.filter(i => i.id !== item.id));
      this.total.update(t => Math.max(0, t - 1));
      if (this.items().length === 0 && this.total() > 0) {
        // Page emptied — refill it (the same offset now returns the next items).
        await this.loadPage(Math.min(this.page(), this.totalPages() - 1));
      }
    } catch (e) {
      console.error('YouTube link fix action failed', e);
      alert('Не удалось выполнить действие. Подробности в консоли.');
    } finally {
      this.busyId.set(undefined);
    }
  }
}
