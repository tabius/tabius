import {ChangeDetectionStrategy, Component, Injector, Input, OnChanges, OnDestroy} from '@angular/core';
import {combineLatest, Subscription} from 'rxjs';
import {Collection, Song, SongDetails} from '@common/catalog-model';
import {CatalogService} from '@app/services/catalog.service';
import {flatMap, takeUntil} from 'rxjs/operators';
import {UserSongSettings} from '@common/user-model';
import {UserService} from '@app/services/user.service';
import {ComponentWithLoadingIndicator} from '@app/utils/component-with-loading-indicator';

@Component({
  selector: 'gt-song',
  templateUrl: './song.component.html',
  styleUrls: ['./song.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongComponent extends ComponentWithLoadingIndicator implements OnDestroy, OnChanges {

  @Input() songId!: number;
  @Input() activeCollectionId?: number;
  @Input() mode: SongComponentMode = 'SongPageMode';

  song?: Song;
  songDetails?: SongDetails;
  collection?: Collection;
  songSettings?: UserSongSettings;
  private songSubscription?: Subscription;

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
    const collection$ = !!this.activeCollectionId ? this.cds.getCollectionById(this.activeCollectionId)
                                                  : song$.pipe(flatMap(song => this.cds.getCollectionById(song && song.collectionId)));
    const songSettings$ = song$.pipe(flatMap(song => this.uds.getUserSongSettings(song && song.id)));
    this.songSubscription = combineLatest([song$, songDetails$, collection$, songSettings$])
        .pipe(takeUntil(this.destroyed$))
        .subscribe(([song, songDetails, collection, songSettings]) => {
          if (!song || !songDetails || !collection || !songSettings) {
            return; // TODO: not found? 404?
          }
          this.song = song;
          this.songDetails = songDetails;
          this.collection = collection;
          this.songSettings = songSettings;
          this.cd.detectChanges();
        });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }
}

export type SongComponentMode = 'SongPageMode'|'PrintMode';

