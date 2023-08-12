import {ChangeDetectionStrategy, Component, Injector, Input, OnChanges, OnDestroy} from '@angular/core';
import {combineLatest, Subscription} from 'rxjs';
import {Collection, CollectionType, Song, SongDetails} from '@common/catalog-model';
import {CatalogService} from '@app/services/catalog.service';
import {flatMap, takeUntil} from 'rxjs/operators';
import {UserSongSettings} from '@common/user-model';
import {UserService} from '@app/services/user.service';
import {ComponentWithLoadingIndicator} from '@app/utils/component-with-loading-indicator';
import {I18N} from '@app/app-i18n';

@Component({
  selector: 'gt-song',
  templateUrl: './song.component.html',
  styleUrls: ['./song.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongComponent extends ComponentWithLoadingIndicator implements OnDestroy, OnChanges {

  @Input({required: true}) songId!: number;
  @Input() showCollectionLink = false;
  @Input() activeCollectionId?: number;
  @Input() mode: SongComponentMode = 'SongPageMode';

  readonly i18n = I18N.songComponent;

  song?: Song;
  songDetails?: SongDetails;
  collection?: Collection;
  primaryCollection?: Collection;
  songSettings?: UserSongSettings;
  private songSubscription?: Subscription;

  // Schema data.
  schemaItemArtistType?: string;
  schemaItemArtistName?: string;

  get loaded(): boolean {
    return this.song !== undefined;
  };

  constructor(private readonly cds: CatalogService,
              private readonly uds: UserService,
              injector: Injector,
  ) {
    super(injector);
  }

  ngOnChanges(): void {
    delete this.song;
    delete this.songDetails;
    delete this.collection;
    if (this.songSubscription) {
      this.songSubscription.unsubscribe();
    }

    const song$ = this.cds.getSongById(this.songId);
    const songDetails$ = this.cds.getSongDetailsById(this.songId);
    const primaryCollection$ = song$.pipe(flatMap(song => this.cds.getCollectionById(song && song.collectionId)));
    const collection$ = !!this.activeCollectionId ? this.cds.getCollectionById(this.activeCollectionId)
                                                  : primaryCollection$;
    const songSettings$ = song$.pipe(flatMap(song => this.uds.getUserSongSettings(song && song.id)));
    this.songSubscription = combineLatest([song$, songDetails$, collection$, primaryCollection$, songSettings$])
        .pipe(takeUntil(this.destroyed$))
        .subscribe(([song, songDetails, collection, primaryCollection, songSettings]) => {
          if (!song || !songDetails || !collection || !songSettings) {
            return; // TODO: not found? 404?
          }
          this.song = song;
          this.songDetails = songDetails;
          this.collection = collection;
          this.primaryCollection = primaryCollection;
          this.songSettings = songSettings;
          this.updateSchemaFields();
          this.cd.detectChanges();
        });
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }

  private updateSchemaFields(): void {
    if (!this.primaryCollection) {
      this.schemaItemArtistType = undefined;
      this.schemaItemArtistName = undefined;
      return;
    }
    this.schemaItemArtistName = this.primaryCollection.name;
    switch (this.primaryCollection.type) {
      case CollectionType.Person:
        this.schemaItemArtistType = 'http://schema.org/Person';
        break;
      case CollectionType.Band:
        this.schemaItemArtistType = 'http://schema.org/MusicGroup';
        break;
      default:
        this.schemaItemArtistType = undefined;
        break;
    }
  }
}

export type SongComponentMode = 'SongPageMode'|'PrintMode';

