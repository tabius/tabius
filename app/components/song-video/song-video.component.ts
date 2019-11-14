import {ChangeDetectionStrategy, Component, Input, OnChanges} from '@angular/core';
import {SongDetails} from '@common/catalog-model';
import {BrowserStateService} from '@app/services/browser-state.service';
import {getFirstYoutubeVideoIdFromLinks} from '@common/util/media_links_utils';

@Component({
  selector: 'gt-song-video',
  templateUrl: './song-video.component.html',
  styleUrls: ['./song-video.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongVideoComponent implements OnChanges {

  @Input() songDetails?: SongDetails;
  onLine = true;
  youtubeId?: string;

  constructor(private readonly bss: BrowserStateService) {
  }

  ngOnChanges(): void {
    this.onLine = this.bss.isOnline();
    if (this.songDetails) {
      this.youtubeId = getFirstYoutubeVideoIdFromLinks(this.songDetails.mediaLinks);
    }
  }

}
