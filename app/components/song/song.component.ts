import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { combineLatest } from 'rxjs';
import { Collection, CollectionType, Song, SongDetails } from '@common/catalog-model';
import { CatalogService } from '@app/services/catalog.service';
import { switchMap, tap } from 'rxjs/operators';
import { UserSongSettings } from '@common/user-model';
import { UserService } from '@app/services/user.service';
import { ComponentWithLoadingIndicator } from '@app/utils/component-with-loading-indicator';
import { I18N } from '@app/app-i18n';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'gt-song',
  templateUrl: './song.component.html',
  styleUrls: ['./song.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongComponent extends ComponentWithLoadingIndicator {
  @Input({ required: true }) songId!: number;
  @Input() showCollectionLink: boolean | 'if-not-primary' = false;
  @Input() activeCollectionId?: number;
  @Input() mode: SongComponentMode = 'song-page-mode';

  readonly i18n = I18N.songComponent;

  song?: Song;
  songDetails?: SongDetails;
  collection?: Collection;
  primaryCollection?: Collection;
  songSettings?: UserSongSettings;

  // Schema data.
  schemaItemArtistType?: string;
  schemaItemArtistName?: string;

  constructor(
    private readonly catalogService: CatalogService,
    private readonly userService: UserService,
  ) {
    super();

    this.changes$
      .pipe(
        tap(() => {
          this.song = undefined;
          this.songDetails = undefined;
          this.collection = undefined;
          this.cdr.markForCheck();
        }),
        switchMap(() => {
          const song$ = this.catalogService.observeSong(this.songId);
          const primaryCollection$ = song$.pipe(switchMap(song => this.catalogService.observeCollection(song?.collectionId)));
          const songDetails$ = this.catalogService.getSongDetailsById(this.songId);
          const activeCollection$ = this.activeCollectionId
            ? this.catalogService.observeCollection(this.activeCollectionId)
            : primaryCollection$;
          const userSongDetails$ = this.userService.getUserSongSettings(this.songId);

          return combineLatest([song$, songDetails$, activeCollection$, primaryCollection$, userSongDetails$]);
        }),
        takeUntilDestroyed(),
      )
      .subscribe(([song, songDetails, collection, primaryCollection, songSettings]) => {
        this.loaded = true;
        this.cdr.markForCheck();
        if (!song || !songDetails || !collection || !songSettings) {
          return; // TODO: not found? 404?
        }
        this.song = song;
        this.songDetails = songDetails;
        this.collection = collection;
        this.primaryCollection = primaryCollection;
        this.songSettings = songSettings;
        this.updateSchemaFields();
      });
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

export type SongComponentMode = 'song-page-mode' | 'print-mode';
