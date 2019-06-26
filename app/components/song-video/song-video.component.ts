import {ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {SongDetails} from '@common/artist-model';

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

  ngOnChanges(changes: SimpleChanges): void {
    this.onLine = !navigator || navigator.onLine === undefined || navigator.onLine;
    if (this.songDetails) {
      this.youtubeLink = this.songDetails.mediaLinks ? this.songDetails.mediaLinks.find(link => link.startsWith('https://www.youtube.com/embed/')) : undefined;
    }
  }

}
