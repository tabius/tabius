import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {ArtistDataService} from '@app/services/artist-data.service';
import {Artist, ArtistDetails, Song} from '@common/artist-model';
import {ActivatedRoute} from '@angular/router';
import {flatMap, map, takeUntil, throttleTime} from 'rxjs/operators';
import {BehaviorSubject, combineLatest, Observable, Subject} from 'rxjs';
import {enableLoadingIndicator, switchToNotFoundMode} from '@app/utils/component-utils';
import {Meta, Title} from '@angular/platform-browser';
import {updatePageMetadata} from '@app/utils/seo-utils';
import {canEditArtist, defined, getArtistImageUrl, getArtistPageLink, getNameFirstFormArtistName, getSongPageLink} from '@common/util/misc-utils';
import {RoutingNavigationHelper} from '@app/services/routing-navigation-helper.service';
import {User} from '@common/user-model';
import {UserDataService} from '@app/services/user-data.service';
import {BrowserStateService} from '@app/services/browser-state.service';

export class ArtistViewModel {
  readonly displayName: string;
  readonly imgSrc: string|undefined;
  readonly songs: Song[];

  constructor(readonly artist: Artist, readonly bands: Artist[], songs: Song[], readonly listed: boolean) {
    this.displayName = getNameFirstFormArtistName(artist);
    this.imgSrc = listed ? getArtistImageUrl(artist.mount) : undefined;
    this.songs = sortSongsAlphabetically(songs);
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

  user?: User;
  canAddSongs = false;
  editorIsOpen = false;
  private songDetailsPrefetched = false;
  loaded = false;
  notFound = false;

  hasImageLoadingError = false;

  constructor(private readonly ads: ArtistDataService,
              private readonly uds: UserDataService,
              private readonly bss: BrowserStateService,
              readonly cd: ChangeDetectorRef,
              private readonly route: ActivatedRoute,
              readonly title: Title,
              readonly meta: Meta,
              private readonly navHelper: RoutingNavigationHelper,
  ) {
  }

  ngOnInit() {
    enableLoadingIndicator(this);
    this.uds.syncSessionStateAsync();

    const artistMount = this.route.snapshot.params['artistMount'];
    const artistId$: Observable<number|undefined> = this.ads.getArtistIdByMount(artistMount);
    const artist$: Observable<Artist|undefined> = artistId$.pipe(flatMap(id => this.ads.getArtistById(id)));
    const artistDetails$: Observable<ArtistDetails|undefined> = artistId$.pipe(flatMap(id => this.ads.getArtistDetails(id)));
    const bands$: Observable<Artist[]> = artistDetails$.pipe(
        flatMap(details => this.ads.getArtistsByIds(details ? details.bandIds : [])),
        map(bands => bands.filter(defined))
    );

    const songs$: Observable<Song[]> = artist$.pipe(
        flatMap(artist => this.ads.getArtistSongList(artist && artist.id)),
        flatMap(songIds => this.ads.getSongsByIds(songIds || [])),
        map(songs => songs.filter(defined))
    );

    combineLatest([artist$, artistDetails$, bands$, songs$, this.uds.getUser()])
        .pipe(
            takeUntil(this.destroyed$),
            throttleTime(100, undefined, {leading: true, trailing: true}),
        )
        .subscribe(([artist, artistDetails, bands, songs, user]) => {
          this.loaded = true;
          if (!artist || !artistDetails || !bands || !songs) {
            switchToNotFoundMode(this);
            return;
          }
          this.artistViewModel = new ArtistViewModel(artist, bands, songs, artistDetails.listed);
          this.user = user;
          this.canAddSongs = canEditArtist(this.user, artist.id);
          this.updateMeta(songs);
          this.cd.detectChanges();
          this.navHelper.restoreScrollPosition();

          // heuristic: prefetch song details.
          if (!this.songDetailsPrefetched && this.bss.isBrowser) {
            this.songDetailsPrefetched = true;
            songs.forEach(s => this.ads.getSongDetailsById(s.id, false));
          }
        });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

  updateMeta(songs: Song[]): void {
    const {artistViewModel} = this;
    if (!artistViewModel) {
      return;
    }
    const name = artistViewModel.displayName;
    updatePageMetadata(this.title, this.meta, {
      title: `${name} — текст песен и аккорды для гитары`,
      description: `${name} — полная коллекция всех песен и аккордов для гитары.${getFirstSongsNames(songs)}`,
      keywords: [`${name} аккорды`, `табы ${name}`, `подбор ${name}`, `тексты ${name}`, `песни ${name}`],
      image: artistViewModel.imgSrc,
    });
  }

  trackBySongId(index: number, song: Song): number {
    return song.id;
  }

  toggleEditor(): void {
    this.editorIsOpen = !this.editorIsOpen && this.canAddSongs;
    this.cd.detectChanges();
  }
}

export function sortSongsAlphabetically(songs: Song[]): Song[] {
  return songs.sort((s1, s2) => s1.title.localeCompare(s2.title));
}

function getFirstSongsNames(songs: Song[]): string {
  if (songs.length === 0) {
    return '';
  }
  let res = '';
  for (let i = 0, n = Math.min(10, songs.length); i < n; i++) {
    const song = songs[i];
    res += ` ${song.title}.`;
  }
  return res;
}

