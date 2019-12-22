import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {Collection, Song} from '@common/catalog-model';
import {getNameFirstFormArtistName, getSongPrintPageLink} from '@common/util/misc-utils';
import {HelpService} from '@app/services/help.service';

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

  title: string = '';

  constructor(private readonly cd: ChangeDetectorRef,
              private readonly helpService: HelpService,
  ) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['collection'] || changes['song']) {
      this.title = this.song.title + (this.titleFormat === 'song-and-collection' ? ` - ${getNameFirstFormArtistName(this.collection)}` : '');
    }
  }

  printSong(): void {
    const printPageUrl = getSongPrintPageLink(this.collection.mount, this.song.mount);
    window.open(printPageUrl, '_blank');
  }

  showKeyboardShortcuts(): void {
    this.helpService.showKeyboardShortcuts();
  }
}
