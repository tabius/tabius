import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {ArtistDataService} from '@app/services/artist-data.service';
import {ActivatedRoute} from '@angular/router';
import {Artist, Song, SongDetails} from '@common/artist-model';
import {BehaviorSubject, combineLatest, of, Subject} from 'rxjs';
import {flatMap, takeUntil, throttleTime} from 'rxjs/operators';
import {throttleIndicator} from '@app/utils/component-utils';
import {Meta, Title} from '@angular/platform-browser';
import {updatePageMetadata} from '@app/utils/seo-utils';
import {UserDataService} from '@app/services/user-data.service';

@Component({
  selector: 'gt-song-page',
  templateUrl: './song-page.component.html',
  styleUrls: ['./song-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongPageComponent implements OnInit, OnDestroy {
  readonly destroyed$ = new Subject<unknown>();
  readonly indicatorIsAllowed$ = new BehaviorSubject(false);

  loaded = false;
  song?: Song;
  songDetails?: SongDetails;
  artist?: Artist;
  youtubeLink?: string;
  onLine = true;
  settingsVisible = false;

  constructor(private readonly ads: ArtistDataService,
              private readonly uds: UserDataService,
              readonly cd: ChangeDetectorRef,
              private readonly route: ActivatedRoute,
              private readonly title: Title,
              private readonly meta: Meta,
  ) {
  }

  ngOnInit() {
    throttleIndicator(this);
    this.onLine = !navigator || navigator.onLine === undefined || navigator.onLine;

    const params = this.route.snapshot.params;
    const artistMount = params['artistMount'];
    const songMount = params['songMount'];


    const artist$ = this.ads.getArtistByMount(artistMount);
    const song$ = this.ads.getSongByMount(artistMount, songMount); //todo: create getSongByMount (artistId,songMount) ?
    const songDetails$ = song$.pipe(flatMap(song => song === undefined ? of(undefined) : this.ads.getSongDetailsById(song.id)));

    combineLatest([artist$, song$, songDetails$])
        .pipe(
            takeUntil(this.destroyed$),
            throttleTime(100, undefined, {leading: true, trailing: true}), //TODO: too much throttling. see (bad params) in the console!
        )
        .subscribe(([artist, song, songDetails]) => {
          if (artist === undefined || song === undefined || songDetails == undefined) {
            console.debug('Bad params for song page! A, S, SD: ', artist, song, songDetails);
            return; // reasons: not everything is loaded
          }
          this.song = song;
          this.songDetails = songDetails;
          this.youtubeLink = songDetails.mediaLinks ? songDetails.mediaLinks.find(link => link.startsWith('https://www.youtube.com/embed/')) : undefined;
          this.loaded = true;
          this.artist = artist;
          this.updateMeta();
          this.cd.markForCheck();
        });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

  updateMeta() {
    if (!this.song || !this.artist) {
      return;
    }
    updatePageMetadata(this.title, this.meta, {
      title: `${this.song.title}. ${this.artist.name}. Табы для гитары`,
      description: `Подбор песни: ${this.song.title}. Исполнитель: ${this.artist.name}. Аккорды для гитары.`,
      keywords: ['подбор песни', this.song.title, this.artist.name, 'табы', 'аккорды', 'гитара'],
    });
  }

  toggleSettings() {
    this.settingsVisible = !this.settingsVisible;
    this.cd.markForCheck();
  }
}
