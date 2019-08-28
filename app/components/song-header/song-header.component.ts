import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input} from '@angular/core';
import {Artist, Song} from '@common/artist-model';
import {getNameFirstFormArtistName} from '@common/util/misc-utils';

@Component({
  selector: 'gt-song-header',
  templateUrl: './song-header.component.html',
  styleUrls: ['./song-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongHeaderComponent {

  /** The song. Required parameter. */
  @Input() song!: Song;

  /** Optional Artist parameter. If present the artist name is appended to the header. */
  @Input() artist?: Artist;

  @Input() showControls = true;

  settingsVisible = false;

  constructor(private readonly cd: ChangeDetectorRef) {
  }

  toggleSettings() {
    this.settingsVisible = !this.settingsVisible;
  }

  getTitle(): string {
    return this.song.title + (this.artist ? ` - ${getNameFirstFormArtistName(this.artist)}` : '');
  }

  closeSettings(): void {
    if (this.settingsVisible) {
      this.settingsVisible = false;
      this.cd.detectChanges();
    }
  }
}
