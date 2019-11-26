import {AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, Input, OnDestroy, OnInit} from '@angular/core';
import {CatalogDataService} from '@app/services/catalog-data.service';
import {combineLatest, of, Subject} from 'rxjs';
import {flatMap, map, takeUntil} from 'rxjs/operators';
import {combineLatest0, defined, getCollectionPageLink, getSongPageLink, isTouchEventsSupportAvailable, sortSongsAlphabetically} from '@common/util/misc-utils';
import {BrowserStateService} from '@app/services/browser-state.service';
import {Router} from '@angular/router';
import {MIN_DESKTOP_WIDTH} from '@common/constants';
import {LINK_STUDIO} from '@common/mounts';
import {UserDataService} from '@app/services/user-data.service';

const Hammer: HammerStatic = require('hammerjs');

@Component({
  selector: 'gt-song-prev-next-navigator',
  templateUrl: './song-prev-next-navigator.component.html',
  styleUrls: ['./song-prev-next-navigator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongPrevNextNavigatorComponent implements OnInit, AfterViewInit, OnDestroy {

  private readonly destroyed$ = new Subject();

  /** Current song. undefined => no song is shown (used for collection page). */
  @Input() songId?: number;
  @Input() activeCollectionId!: number;

  prevLink?: string;
  prevLinkIsCollection = false;
  nextLink?: string;
  nextLinkIsCollection = false;

  isCollectionFromPublicCatalog = false;

  showStickySideBars: 'initializing'|'yes'|'no' = 'initializing';

  private hammer?: HammerManager;

  constructor(private readonly cds: CatalogDataService,
              private readonly cd: ChangeDetectorRef,
              private readonly uds: UserDataService,
              private readonly bss: BrowserStateService,
              private readonly router: Router,
  ) {
  }

  ngOnInit(): void {
    const collection$ = this.cds.getCollectionById(this.activeCollectionId);
    // list of all collection songs sorted by id.
    const allSongs$ = collection$.pipe(
        flatMap(collection => collection ? this.cds.getCollectionSongList(collection.id) : of([])),
        flatMap(songIds => combineLatest0((songIds || []).map(id => this.cds.getSongById(id)))),
        map(songs => sortSongsAlphabetically(songs.filter(defined))),
    );
    const user$ = this.uds.getUser();
    combineLatest([collection$, allSongs$, user$])
        .pipe(
            takeUntil(this.destroyed$),
            flatMap(([collection, allSongs, user]) => {
              if (!collection || !allSongs || allSongs.length === 0) {
                return of([undefined, undefined, undefined, undefined, undefined]);
              }
              const songIdx = this.songId === undefined ? -1 : allSongs.findIndex(song => song.id === this.songId);
              const prevSongIdx = songIdx === -1 ? allSongs.length - 1 : songIdx - 1;
              const prevSong = prevSongIdx === -1 ? undefined : allSongs[prevSongIdx];
              const nextSongIdx = songIdx === -1 ? 0 : songIdx + 1;
              const nextSong = nextSongIdx >= allSongs.length ? undefined : allSongs[nextSongIdx];
              this.isCollectionFromPublicCatalog = !user || user.collectionId !== this.activeCollectionId;
              return combineLatest([
                of(collection),
                of(prevSong),
                prevSong ? this.cds.getCollectionById(prevSong.collectionId) : of(undefined),
                of(nextSong),
                nextSong ? this.cds.getCollectionById(nextSong.collectionId) : of(undefined),
              ]);
            })
        )
        .subscribe(([collection, prevSong, prevSongPrimaryCollection, nextSong, nextSongPrimaryCollection]) => {
          if (!collection) {
            return;
          }
          // noinspection DuplicatedCode
          if (prevSong && prevSongPrimaryCollection) {
            this.prevLink = getSongPageLink(collection.mount, prevSong.mount, prevSongPrimaryCollection.mount);
            this.prevLinkIsCollection = false;
          } else {
            this.prevLink = this.isCollectionFromPublicCatalog ? getCollectionPageLink(collection.mount) : LINK_STUDIO;
            this.prevLinkIsCollection = true;
          }
          // noinspection DuplicatedCode
          if (nextSong && nextSongPrimaryCollection) {
            this.nextLink = getSongPageLink(collection.mount, nextSong.mount, nextSongPrimaryCollection.mount);
            this.nextLinkIsCollection = false;
          } else {
            this.nextLink = this.isCollectionFromPublicCatalog ? getCollectionPageLink(collection.mount) : LINK_STUDIO;
            this.nextLinkIsCollection = true;
          }
          this.cd.detectChanges();
        });
  }

  ngAfterViewInit(): void {
    if (this.bss.isBrowser && isTouchEventsSupportAvailable()) {
      delete Hammer.defaults.cssProps.userSelect; // to allow selection
      this.hammer = new Hammer(window.document.body, {
        touchAction: 'auto',
        inputClass: Hammer['SUPPORT_POINTER_EVENTS'] ? Hammer.PointerEventInput : Hammer.TouchMouseInput,
        recognizers: [[Hammer.Swipe, {direction: Hammer.DIRECTION_HORIZONTAL}]],
      });
      this.hammer.on('swiperight', () => this.navigate(this.nextLink));
      this.hammer.on('swipeleft', () => this.navigate(this.prevLink));
    }
    setTimeout(() => this.updateStickySideBarsVisibility(), 100);
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    if (this.hammer) {
      this.hammer.destroy();
      delete this.hammer;
    }
  }

  @HostListener('window:resize', [])
  onWindowResize() {
    this.updateStickySideBarsVisibility();
  }

  private updateStickySideBarsVisibility(): void {
    const showStickySideBars = window.innerWidth > MIN_DESKTOP_WIDTH ? 'yes' : 'no';
    if (this.showStickySideBars !== showStickySideBars) {
      this.showStickySideBars = showStickySideBars;
      this.cd.detectChanges();
    }
  }

  navigate(link: string|undefined): void {
    if (link) {
      this.router.navigate([link]).catch(err => console.error(err));
    }
  }
}
