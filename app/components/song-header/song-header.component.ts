import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {Artist, Song} from '@common/artist-model';
import {getNameFirstFormArtistName} from '@common/util/misc-utils';

@Component({
  selector: 'gt-song-header',
  templateUrl: './song-header.component.html',
  styleUrls: ['./song-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongHeaderComponent implements OnChanges {

  /** The song. Required parameter. */
  @Input() song!: Song;

  /** Optional Artist parameter. If present the artist name is appended to the header. */
  @Input() artist?: Artist;

  @Input() showControls = true;

  settingsVisible = false;

  title: string = '';

  constructor(private readonly cd: ChangeDetectorRef) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['artist'] || changes['song']) {
      this.title = this.song.title + (this.artist ? ` - ${getNameFirstFormArtistName(this.artist)}` : '');
    }
  }

  toggleSettings() {
    this.settingsVisible = !this.settingsVisible;
  }

  closeSettings(): void {
    if (this.settingsVisible) {
      this.settingsVisible = false;
      this.cd.detectChanges();
    }
  }
}
