import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {ArtistDataService} from '@app/services/artist-data.service';
import {Artist, Song} from '@common/artist-model';
import {ActivatedRoute} from '@angular/router';
import {flatMap, map, takeUntil, throttleTime} from 'rxjs/operators';
import {BehaviorSubject, combineLatest, Observable, of, Subject} from 'rxjs';
import {throttleIndicator} from '@app/utils/component-utils';
import {Meta, Title} from '@angular/platform-browser';
import {updatePageMetadata} from '@app/utils/seo-utils';
import {defined, getArtistImageUrl, getArtistPageLink, getNameFirstFormArtistName, getSongPageLink} from '@common/util/misc-utils';
import {RoutingNavigationHelper} from '@app/services/routing-navigation-helper.service';

export class ArtistViewModel {
  readonly displayName: string;
  readonly imgSrc: string;

  constructor(readonly artist: Artist, readonly bands: Artist[], readonly songs: Song[]) {
    this.displayName = getNameFirstFormArtistName(artist);
    this.imgSrc = getArtistImageUrl(artist.mount);
  }
}

@Component({
  selector: 'gt-artist-page',
  templateUrl: './artist-page.component.html',
  styleUrls: ['./artist-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtistPageComponent implements OnInit, OnDestroy {
  readonly destroyed$ = new Subject();
  readonly indicatorIsAllowed$ = new BehaviorSubject(false);
  readonly getArtistPageLink = getArtistPageLink;
  readonly getSongPageLink = getSongPageLink;

  artistViewModel?: ArtistViewModel;

  get loaded(): boolean {
    return this.artistViewModel !== undefined;
  }

  constructor(private readonly ads: ArtistDataService,
              readonly cd: ChangeDetectorRef,
              private readonly route: ActivatedRoute,
              private title: Title,
              private readonly meta: Meta,
              private readonly navHelper: RoutingNavigationHelper,
  ) {
  }

  ngOnInit() {
    throttleIndicator(this);

    const artistMount = this.route.snapshot.params['artistMount'];
    const artist$: Observable<Artist|undefined> = this.ads.getArtistByMount(artistMount);
    const bands$ = artist$.pipe(
        flatMap(artist => artist ? this.ads.getArtistsByIds(artist.bandIds) : of(undefined)),
        map(bands => bands ? bands.filter(defined) : undefined),
    ) as Observable<Artist[]>;

    const songs$ = artist$.pipe(
        flatMap(artist => this.ads.getSongsByArtistId(artist ? artist.id : undefined)),
    ) as Observable<Song[]>;

    combineLatest([artist$, bands$, songs$])
        .pipe(
            takeUntil(this.destroyed$),
            throttleTime(100, undefined, {leading: true, trailing: true}),
        )
        .subscribe(([artist, bands, songs]) => {
          if (!artist || !bands || !songs) {
            return;
          }
          this.artistViewModel = new ArtistViewModel(artist, bands, songs);
          this.updateMeta();
          this.cd.detectChanges();
          this.navHelper.restoreScrollPosition();
        });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

  updateMeta() {
    if (!this.artistViewModel) {
      return;
    }
    const name = this.artistViewModel.displayName;
    updatePageMetadata(this.title, this.meta, {
      title: `${name}. Список песен. Табы и аккорды для гитары`,
      description: `${name}. Список всех песен, табы и подбор аккордов для гитары.`,
      keywords: [`${name} табы для гитары`, `аккорды ${name}`, `подбор ${name}`],
      image: this.artistViewModel!.imgSrc
    });
  }

  trackBySongId(index: number, song: Song): number {
    return song.id;
  }

}
