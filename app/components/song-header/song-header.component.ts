import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Collection, Song } from '@common/catalog-model';
import { getCollectionPageLink, getNameFirstFormArtistName, getSongPrintPageLink } from '@common/util/misc-utils';
import { HelpService } from '@app/services/help.service';
import { I18N } from '@app/app-i18n';
import { CatalogService } from '@app/services/catalog.service';
import { firstValueFrom, Observable } from 'rxjs';

export type SongHeaderTitleFormat = 'song' | 'song-and-collection';

@Component({
    selector: 'gt-song-header',
    templateUrl: './song-header.component.html',
    styleUrls: ['./song-header.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class SongHeaderComponent implements OnChanges {
  @Input({ required: true }) song!: Song;

  /** Currently shown collection. May be not the primary song collection. */
  @Input({ required: true }) collection!: Collection;

  @Input() showCollectionLink: boolean | 'if-not-primary' = false;

  @Input() titleFormat: SongHeaderTitleFormat = 'song-and-collection';

  @Input() showControls = true;

  readonly i18n = I18N.songHeaderComponent;

  title = '';

  constructor(
    private readonly helpService: HelpService,
    private readonly cds: CatalogService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['collection'] || changes['song']) {
      this.title =
        this.song.title + (this.titleFormat === 'song-and-collection' ? ` - ${getNameFirstFormArtistName(this.collection)}` : '');
    }
  }

  get isPrimaryCollection(): boolean {
    return this.song.collectionId === this.collection.id;
  }

  get primaryCollection$(): Observable<Collection | undefined> {
    return this.cds.observeCollection(this.song.collectionId);
  }

  async printSong(): Promise<void> {
    const primaryCollection = await firstValueFrom(this.primaryCollection$);
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
