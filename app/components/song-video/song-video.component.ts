import { ChangeDetectionStrategy, Component, Inject, Input, OnChanges, Optional } from '@angular/core';
import { BrowserStateService } from '@app/services/browser-state.service';
import { getFirstYoutubeVideoIdFromLinks } from '@common/util/media-links-utils';
import { isBotUserAgent } from '@common/util/misc-utils';
import { REQUEST } from '@app/express.tokens';

@Component({
  selector: 'gt-song-video',
  templateUrl: './song-video.component.html',
  styleUrls: ['./song-video.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongVideoComponent implements OnChanges {
  @Input() title: string | null = null;
  @Input() mediaLinks?: string[];

  youtubeId?: string;

  /** The frame is always shown when we have a valid video. This helps to reduce flickering from the re-layout. */
  isFrameVisible = true;

  /** Video load is not allowed in SSR response. Reason: it will be re-drawn by the client version. */
  isVideoLoadAllowed = true;

  readonly videoCssStyle: Record<string, string | number> = {};
  private readonly isBot: boolean;

  constructor(private readonly bss: BrowserStateService, @Optional() @Inject(REQUEST) request: any) {
    this.isBot = isBotUserAgent(this.bss.getUserAgentString(request));
    this.updateVisibleFlag();

    // Up-scale video in mobile phone screen size range to make it use the whole width of the screen.
    if (bss.isSmallScreenMode) {
      const defaultVideoWidth = 300;
      const defaultVideoHeight = 169;
      const videoWidth = bss.isBrowser ? Math.min(480, Math.max(defaultVideoWidth, window.innerWidth - 20)) : defaultVideoWidth;
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
