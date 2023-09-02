import {ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {Collection, Song} from '@common/catalog-model';
import {getCollectionPageLink, getNameFirstFormArtistName, getSongPrintPageLink} from '@common/util/misc-utils';
import {HelpService} from '@app/services/help.service';
import {I18N} from '@app/app-i18n';
import {CatalogService} from '@app/services/catalog.service';
import {firstValueFrom} from 'rxjs';

export type SongHeaderTitleFormat = 'song'|'song-and-collection';

@Component({
  selector: 'gt-song-header',
  templateUrl: './song-header.component.html',
  styleUrls: ['./song-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongHeaderComponent implements OnChanges {

  @Input({required: true}) song!: Song;

  @Input({required: true}) collection!: Collection;

  @Input() showCollectionLink = false;

  @Input() titleFormat: SongHeaderTitleFormat = 'song-and-collection';

  @Input() showControls = true;

  readonly i18n = I18N.songHeaderComponent;

  title = '';

  constructor(private readonly helpService: HelpService,
              private readonly cds: CatalogService,
  ) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['collection'] || changes['song']) {
      this.title = this.song.title + (this.titleFormat === 'song-and-collection' ? ` - ${getNameFirstFormArtistName(this.collection)}` : '');
    }
  }

  async printSong(): Promise<void> {
    const primaryCollection = await firstValueFrom(this.cds.observeCollection(this.song.collectionId));
    const printPageUrl = getSongPrintPageLink(this.collection.mount, this.song.mount, primaryCollection?.mount);
    window.open(printPageUrl, '_blank');
  }

  showKeyboardShortcuts(): void {
    this.helpService.showKeyboardShortcuts();
  }

  get collectionLink(): string {
    return getCollectionPageLink(this.collection.mount);
  }
}
