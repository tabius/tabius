import {ChangeDetectionStrategy, Component, Input, OnChanges} from '@angular/core';
import {SongDetails} from '@common/artist-model';
import {BrowserStateService} from '@app/services/browser-state.service';

@Component({
  selector: 'gt-song-video',
  templateUrl: './song-video.component.html',
  styleUrls: ['./song-video.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongVideoComponent implements OnChanges {

  @Input() songDetails?: SongDetails;
  onLine = true;
  youtubeLink?: string;

  constructor(private readonly bss: BrowserStateService) {
  }

  ngOnChanges(): void {
    this.onLine = this.bss.isOnline();
    if (this.songDetails) {
      this.youtubeLink = this.songDetails.mediaLinks ? this.songDetails.mediaLinks.find(link => link.startsWith('https://www.youtube.com/embed/')) : undefined;
    }
  }

}
