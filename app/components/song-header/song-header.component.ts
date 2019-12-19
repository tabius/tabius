import {ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, Input, OnChanges, SimpleChanges} from '@angular/core';
import {Collection, Song} from '@common/catalog-model';
import {getNameFirstFormArtistName, getSongPrintPageLink} from '@common/util/misc-utils';

export type SongHeaderTitleFormat = 'song'|'song-and-collection';

@Component({
  selector: 'gt-song-header',
  templateUrl: './song-header.component.html',
  styleUrls: ['./song-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongHeaderComponent implements OnChanges {

  @Input() song!: Song;

  @Input() collection!: Collection;

  @Input() titleFormat: SongHeaderTitleFormat = 'song-and-collection';

  @Input() showControls = true;

  settingsVisible = false;

  title: string = '';

  constructor(
      private readonly cd: ChangeDetectorRef,
  ) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['collection'] || changes['song']) {
      this.title = this.song.title + (this.titleFormat === 'song-and-collection' ? ` - ${getNameFirstFormArtistName(this.collection)}` : '');
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
    const printPageUrl = getSongPrintPageLink(this.collection.mount, this.song.mount);
    window.open(printPageUrl, '_blank');
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.code === 'Escape') {
      this.closeSettings();
    }
  }
}
