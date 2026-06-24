import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '@app/services/user.service';
import { YoutubeLinkFixService } from '@app/services/youtube-link-fix.service';
import { YoutubeCandidate, YoutubeLinkFixItem } from '@common/api-model';
import { getSongPageLink, isModerator } from '@common/util/misc-utils';

/** Items shown per page. */
const PAGE_SIZE = 20;

/**
 * Moderator-only review queue for broken YouTube links. Lists songs whose video is broken together
 * with the replacement candidates found by scripts/find-youtube-replacements.ts. For each item the
 * moderator can play any candidate embedded inline, compare it against the song text shown on the
 * page, and then approve a replacement (writes it to the song), reject the candidates, or dismiss it.
 *
 * Access is enforced on the backend (every /api/youtube-fix endpoint is moderator-only); this client
 * guard only avoids rendering the page to non-moderators.
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

  readonly items = signal<YoutubeLinkFixItem[]>([]);
  readonly loaded = signal(false);
  /** Id of the item with an action in flight (disables its buttons). */
  readonly busyId = signal<number | undefined>(undefined);
  /** Per-item custom URL/id typed by the moderator. */
  readonly customUrl: Record<number, string> = {};

  readonly page = signal(0);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.items().length / PAGE_SIZE)));
  readonly pageItems = computed(() => {
    const start = this.page() * PAGE_SIZE;
    return this.items().slice(start, start + PAGE_SIZE);
  });
  /** Candidate video ids currently embedded (play was clicked). */
  private readonly playing = signal<Set<string>>(new Set());

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
          void this.reload();
        }
      });
  }

  async reload(): Promise<void> {
    const response = await this.service.getQueue();
    this.items.set(response.items);
    this.loaded.set(true);
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
    return this.playing().has(videoId);
  }

  play(videoId: string): void {
    this.playing.update(set => new Set(set).add(videoId));
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

  goToPage(page: number): void {
    const clamped = Math.min(Math.max(0, page), this.totalPages() - 1);
    if (clamped !== this.page()) {
      this.playing.set(new Set()); // Stop embedded players when leaving the page.
      this.page.set(clamped);
      window.scrollTo({ top: 0 });
    }
  }

  async approve(item: YoutubeLinkFixItem, videoId: string | undefined): Promise<void> {
    const value = (videoId || '').trim();
    if (!value) {
      return;
    }
    await this.runAction(item, () => this.service.approve(item.id, value));
  }

  async reject(item: YoutubeLinkFixItem): Promise<void> {
    await this.runAction(item, () => this.service.reject(item.id));
  }

  async dismiss(item: YoutubeLinkFixItem): Promise<void> {
    await this.runAction(item, () => this.service.dismiss(item.id));
  }

  private async runAction(item: YoutubeLinkFixItem, action: () => Promise<unknown>): Promise<void> {
    if (this.busyId() !== undefined) {
      return;
    }
    this.busyId.set(item.id);
    try {
      await action();
      this.items.update(list => list.filter(i => i.id !== item.id));
      // Keep the current page valid after the list shrinks.
      if (this.page() > this.totalPages() - 1) {
        this.page.set(this.totalPages() - 1);
      }
    } catch (e) {
      console.error('YouTube link fix action failed', e);
      alert('Не удалось выполнить действие. Подробности в консоли.');
    } finally {
      this.busyId.set(undefined);
    }
  }
}
