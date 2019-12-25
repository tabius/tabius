import {ChangeDetectionStrategy, Component, Input, OnChanges} from '@angular/core';
import {BrowserStateService} from '@app/services/browser-state.service';
import {getFirstYoutubeVideoIdFromLinks} from '@common/util/media_links_utils';

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

  constructor(private readonly bss: BrowserStateService) {
  }

  ngOnChanges(): void {
    this.onLine = this.bss.isOnline();
    if (this.mediaLinks) {
      this.youtubeId = getFirstYoutubeVideoIdFromLinks(this.mediaLinks);
    }
  }

}
