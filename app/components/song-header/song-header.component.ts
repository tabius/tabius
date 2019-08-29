import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {Artist, Song} from '@common/artist-model';
import {getNameFirstFormArtistName, getSongPrintPageLink} from '@common/util/misc-utils';

export type SongHeaderTitleFormat = 'song'|'song-and-artist';

@Component({
  selector: 'gt-song-header',
  templateUrl: './song-header.component.html',
  styleUrls: ['./song-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongHeaderComponent implements OnChanges {

  @Input() song!: Song;

  @Input() artist!: Artist;

  @Input() titleFormat: SongHeaderTitleFormat = 'song-and-artist';

  @Input() showControls = true;

  settingsVisible = false;

  title: string = '';

  constructor(
      private readonly cd: ChangeDetectorRef,
  ) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['artist'] || changes['song']) {
      this.title = this.song.title + (this.titleFormat === 'song-and-artist' ? ` - ${getNameFirstFormArtistName(this.artist)}` : '');
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

  printSong(): void {
    const printPageUrl = getSongPrintPageLink(this.artist.mount, this.song.mount);
    window.open(printPageUrl, '_blank');
  }
}
