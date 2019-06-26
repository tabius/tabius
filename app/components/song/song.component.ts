import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges} from '@angular/core';
import {BehaviorSubject, combineLatest, Subject, Subscription} from 'rxjs';
import {throttleIndicator} from '@app/utils/component-utils';
import {Artist, Song, SongDetails} from '@common/artist-model';
import {ArtistDataService} from '@app/services/artist-data.service';
import {flatMap, takeUntil} from 'rxjs/operators';

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
  @Input() mode: SongComponentMode = SongComponentMode.SongPage;

  song?: Song;
  songDetails?: SongDetails;
  artist?: Artist;
  private songSubscription?: Subscription;

  readonly SongPageMode = SongComponentMode.SongPage;

  get loaded(): boolean {
    return this.song !== undefined;
  };

  constructor(private readonly ads: ArtistDataService,
              readonly cd: ChangeDetectorRef,
  ) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    delete this.song;
    delete this.songDetails;
    delete this.artist;
    if (this.songSubscription) {
      this.songSubscription.unsubscribe();
    }

    const song$ = this.ads.getSongById(this.songId);
    const songDetails$ = this.ads.getSongDetailsById(this.songId);
    const artist$ = song$.pipe(flatMap(song => this.ads.getArtistById(song ? song.artistId : undefined)));

    this.songSubscription = combineLatest([song$, songDetails$, artist$])
        .pipe(takeUntil(this.destroyed$))
        .subscribe(([song, songDetails, artist]) => {
          if (!song || !songDetails || !artist) {
            return; // reasons: not everything is loaded
          }
          this.song = song;
          this.songDetails = songDetails;
          this.artist = artist;
          this.cd.detectChanges();
        });
  }

  ngOnInit() {
    throttleIndicator(this);
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }
}

/** Song may be rendered slightly differently based on the current mode .*/
export enum SongComponentMode {
  SongPage = 'SongPageMode',
  Playlist = 'PlaylistMode',
}

