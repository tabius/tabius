import { ChangeDetectionStrategy, Component, inject, Input, OnChanges } from '@angular/core';
import { BrowserStateService } from '@app/services/browser-state.service';
import { getFirstYoutubeVideoIdFromLinks } from '@common/util/media-links-utils';
import { isBotUserAgent } from '@common/util/misc-utils';
import { REQUEST } from '@app/express.tokens';
import type { Request } from 'express';

const defaultVideoWidth = 300;
const defaultVideoHeight = 169;

@Component({
  selector: 'gt-song-video',
  templateUrl: './song-video.component.html',
  styleUrls: ['./song-video.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class SongVideoComponent implements OnChanges {
  private readonly bss = inject(BrowserStateService);

  @Input() title: string | null = null;
  @Input() mediaLinks?: string[];

  youtubeId?: string;

  /** The frame is always shown when we have a valid video. This helps to reduce flickering from the re-layout. */
  isFrameVisible = true;

  /** Video load is not allowed in SSR response. Reason: it will be re-drawn by the client version. */
  isVideoLoadAllowed = true;

  readonly videoCssStyle: Record<string, string | number> = {};
  private readonly isBot: boolean;

  constructor() {
    const bss = this.bss;
    const request = inject<Request>(REQUEST, { optional: true });

    this.isBot = isBotUserAgent(this.bss.getUserAgentString(request));
    this.updateVisibleFlag();

    // Up-scale video in mobile phone screen size range to make it use the whole width of the screen.
    if (bss.isSmallScreenMode) {
      const videoWidth = this.bss.isBrowser ? getSmallScreenYoutubeVideoWidthInBrowser() : defaultVideoWidth;
      const videoHeight = defaultVideoHeight * (videoWidth / defaultVideoWidth);
      this.videoCssStyle = { 'width.px': videoWidth, 'height.px': videoHeight };
    } else {
      // Wide screen (desktop).
      this.videoCssStyle = { 'width.px': 480, 'height.px': 270 };
    }
  }

  ngOnChanges(): void {
    this.youtubeId = getFirstYoutubeVideoIdFromLinks(this.mediaLinks);
    this.updateVisibleFlag();
  }

  private updateVisibleFlag(): void {
    this.isFrameVisible = !!this.youtubeId && !this.isBot && this.bss.isOnline();
    this.isVideoLoadAllowed = this.isFrameVisible && this.bss.isBrowser;
  }
}

export function getSmallScreenYoutubeVideoWidthInBrowser(): number {
  const availableWidth = typeof window !== 'undefined' ? window.document.body.clientWidth - 20 : defaultVideoWidth;
  return Math.min(480, Math.max(defaultVideoWidth, availableWidth));
}
