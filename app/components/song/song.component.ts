import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, OnInit} from '@angular/core';
import {BehaviorSubject, combineLatest, Subject, Subscription} from 'rxjs';
import {enableLoadingIndicator} from '@app/utils/component-utils';
import {Collection, Song, SongDetails} from '@common/catalog-model';
import {CatalogDataService} from '@app/services/catalog-data.service';
import {flatMap, takeUntil} from 'rxjs/operators';
import {UserSongSettings} from '@common/user-model';
import {UserDataService} from '@app/services/user-data.service';

@Component({
  selector: 'gt-song',
  templateUrl: './song.component.html',
  styleUrls: ['./song.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongComponent implements OnInit, OnDestroy, OnChanges {

  readonly destroyed$ = new Subject();
  readonly indicatorIsAllowed$ = new BehaviorSubject(false);

  @Input() songId!: number;
  @Input() mode: SongComponentMode = 'SongPageMode';

  song?: Song;
  songDetails?: SongDetails;
  collection?: Collection;
  songSettings?: UserSongSettings;
  private songSubscription?: Subscription;

  get loaded(): boolean {
    return this.song !== undefined;
  };

  constructor(private readonly cds: CatalogDataService,
              private readonly uds: UserDataService,
              readonly cd: ChangeDetectorRef,
  ) {
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
    const collection$ = song$.pipe(flatMap(song => this.cds.getCollectionById(song && song.collectionId)));
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

  ngOnInit() {
    enableLoadingIndicator(this);
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }
}

export type SongComponentMode = 'SongPageMode'|'PlaylistMode'|'PrintMode';

