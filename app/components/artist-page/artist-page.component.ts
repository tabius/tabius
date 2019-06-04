import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {ArtistDataService} from '@app/services/artist-data.service';
import {Artist, Song} from '@common/artist-model';
import {ActivatedRoute} from '@angular/router';
import {flatMap, map, takeUntil, throttleTime} from 'rxjs/operators';
import {BehaviorSubject, combineLatest, Observable, of, Subject} from 'rxjs';
import {throttleIndicator} from '@app/utils/component-utils';
import {Meta, Title} from '@angular/platform-browser';
import {updatePageMetadata} from '@app/utils/seo-utils';
import {getArtistImageUrl, getNameFirstFormArtistName} from '@common/util/misc_utils';

class ArtistViewModel {
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
export class ArtistPageComponent implements OnInit {
  readonly destroyed$ = new Subject<unknown>();
  readonly indicatorIsAllowed$ = new BehaviorSubject(false);

  loaded = false;
  artistViewModel?: ArtistViewModel;

  constructor(private readonly ads: ArtistDataService,
              readonly cd: ChangeDetectorRef,
              private readonly route: ActivatedRoute,
              private title: Title,
              private readonly meta: Meta,
  ) {
  }

  //TODO: use https://angular.io/guide/router#resolve-guard to get initial data
  ngOnInit() {
    throttleIndicator(this);

    const artistMount = this.route.snapshot.params['artistMount'];
    const artist$: Observable<Artist|undefined> = this.ads.getArtistByMount(artistMount);
    const bands$ = artist$.pipe(
        flatMap(artist => (!artist || artist.bandIds.length === 0) ? of([]) : this.ads.getArtistsByIds(artist.bandIds)),
        map(bands => bands.filter(v => v !== undefined)),
    ) as Observable<Artist[]>;

    const songs$ = artist$.pipe(
        flatMap(artist => artist === undefined ? of([]) : this.ads.getSongsByArtistId(artist.id)),
    ) as Observable<Song[]>;

    combineLatest([artist$, bands$, songs$])
        .pipe(
            takeUntil(this.destroyed$),
            throttleTime(100, undefined, {leading: true, trailing: true}),
        )
        .subscribe(([artist, bands, songs]) => {
          //todo: details may be undefined => show not found?
          if (!artist) {
            return;
          }
          this.artistViewModel = new ArtistViewModel(artist, bands, songs);
          this.loaded = true;
          this.updateMeta();
          this.cd.markForCheck();
        });
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
