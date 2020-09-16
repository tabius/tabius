import {ChangeDetectionStrategy, Component, Inject, Input, OnChanges, Optional} from '@angular/core';
import {BrowserStateService} from '@app/services/browser-state.service';
import {getFirstYoutubeVideoIdFromLinks} from '@common/util/media_links_utils';
import {isBotUserAgent} from '@common/util/misc-utils';
import {REQUEST} from '@nguniversal/express-engine/tokens';
import {MIN_DESKTOP_WIDTH} from '@common/common-constants';

const DEFAULT_VIDEO_WIDTH = 300;
const DEFAULT_VIDEO_HEIGHT = 169;

@Component({
  selector: 'gt-song-video',
  templateUrl: './song-video.component.html',
  styleUrls: ['./song-video.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongVideoComponent implements OnChanges {

  @Input() title: string|null = null;
  @Input() mediaLinks?: string[];

  youtubeId?: string;

  /** Frame is always shown when we have a valid video. This helps to reduce flickering from the re-layout. */
  isFrameVisible = true;

  /** Video load is not allowed in SSR response. Reason: it will be re-drawn by the client version. */
  isVideoLoadAllowed = true;

  readonly videoCssStyle: Record<string, string|number> = {};
  private readonly isBot: boolean;

  constructor(
      private readonly bss: BrowserStateService,
      @Optional() @Inject(REQUEST) private request: any,
  ) {
    this.isBot = isBotUserAgent(this.bss.getUserAgentString(request));
    this.updateVisibleFlag();


    // Up-scale video in mobile phone screen size range to make it consume the whole width of the screen.
    const videoWidth = bss.isBrowser && window.innerWidth <= MIN_DESKTOP_WIDTH
                       ? Math.min(500, Math.max(DEFAULT_VIDEO_WIDTH, window.innerWidth - 20))
                       : DEFAULT_VIDEO_WIDTH;
    const videoHeight = DEFAULT_VIDEO_HEIGHT * (videoWidth / DEFAULT_VIDEO_WIDTH);
    this.videoCssStyle = {'width.px': videoWidth, 'height.px': videoHeight};
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
