import {ChangeDetectionStrategy, Component, Inject, Input, OnChanges, Optional} from '@angular/core';
import {BrowserStateService} from '@app/services/browser-state.service';
import {getFirstYoutubeVideoIdFromLinks} from '@common/util/media_links_utils';
import {isBotUserAgent} from '@common/util/misc-utils';
import {REQUEST} from '@nguniversal/express-engine/tokens';

@Component({
  selector: 'gt-song-video',
  templateUrl: './song-video.component.html',
  styleUrls: ['./song-video.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongVideoComponent implements OnChanges {

  @Input() title: string|null = null;
  @Input() mediaLinks?: string[];

  onLine = true;
  youtubeId?: string;
  isBot = false;

  constructor(
      private readonly bss: BrowserStateService,
      @Optional() @Inject(REQUEST) private request: any,
  ) {
    this.isBot = isBotUserAgent(this.bss.getUserAgentString(request));
  }

  ngOnChanges(): void {
    this.onLine = this.bss.isOnline();
    if (this.mediaLinks) {
      this.youtubeId = getFirstYoutubeVideoIdFromLinks(this.mediaLinks);
    }
  }

}
