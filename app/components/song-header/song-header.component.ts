import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {Collection, Song} from '@common/catalog-model';
import {assertTruthy, getCollectionPageLink, getNameFirstFormArtistName, getSongPrintPageLink} from '@common/util/misc-utils';
import {HelpService} from '@app/services/help.service';
import {I18N} from '@app/app-i18n';

export type SongHeaderTitleFormat = 'song'|'song-and-collection';

@Component({
  selector: 'gt-song-header',
  templateUrl: './song-header.component.html',
  styleUrls: ['./song-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongHeaderComponent implements OnInit, OnChanges {

  @Input() song!: Song;

  @Input() collection!: Collection;

  @Input() showCollectionLink = false;

  @Input() titleFormat: SongHeaderTitleFormat = 'song-and-collection';

  @Input() showControls = true;

  readonly i18n = I18N.songHeaderComponent;

  title = '';

  constructor(private readonly cd: ChangeDetectorRef,
              private readonly helpService: HelpService,
  ) {
  }

  ngOnInit(): void {
    assertTruthy(this.song && this.collection);
  }

  ngOnChanges(changes: SimpleChanges): void {
    assertTruthy(this.song && this.collection);
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

  get collectionLink(): string {
    return getCollectionPageLink(this.collection.mount);
  }
}
