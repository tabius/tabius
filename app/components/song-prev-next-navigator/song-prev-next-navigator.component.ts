import {ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, Input, OnDestroy, OnInit} from '@angular/core';
import {CatalogService} from '@app/services/catalog.service';
import {combineLatest, of, Subject} from 'rxjs';
import {flatMap, map, takeUntil} from 'rxjs/operators';
import {combineLatest0, defined, getCollectionPageLink, getSongPageLink, isTouchEventsSupportAvailable, sortSongsAlphabetically} from '@common/util/misc-utils';
import {BrowserStateService} from '@app/services/browser-state.service';
import {Router} from '@angular/router';
import {MIN_DESKTOP_WIDTH} from '@common/common-constants';

const Hammer: HammerStatic = require('hammerjs');

@Component({
  selector: 'gt-song-prev-next-navigator',
  templateUrl: './song-prev-next-navigator.component.html',
  styleUrls: ['./song-prev-next-navigator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongPrevNextNavigatorComponent implements OnInit, OnDestroy {

  private readonly destroyed$ = new Subject();

  /** Current song. undefined => no song is shown (used for collection page). */
  @Input() songId?: number;
  @Input() activeCollectionId!: number;

  prevLink?: string;
  prevLinkIsCollection = false;
  nextLink?: string;
  nextLinkIsCollection = false;

  isInitializing = true;
  isWideScreenMode = false;

  private hammer?: HammerManager;

  constructor(private readonly cds: CatalogService,
              private readonly cd: ChangeDetectorRef,
              private readonly bss: BrowserStateService,
              private readonly router: Router,
  ) {
  }

  // TODO: handle changes & re-subscribe!
  ngOnInit(): void {
    const collection$ = this.cds.getCollectionById(this.activeCollectionId);
    // list of all collection songs sorted by id.
    const allSongs$ = collection$.pipe(
        flatMap(collection => collection ? this.cds.getSongIdsByCollection(collection.id) : of([])),
        flatMap(songIds => combineLatest0((songIds || []).map(id => this.cds.getSongById(id)))),
        map(songs => sortSongsAlphabetically(songs.filter(defined))),
    );
    combineLatest([collection$, allSongs$])
        .pipe(
            flatMap(([collection, allSongs]) => {
              if (!collection || !allSongs || allSongs.length === 0) {
                return of([undefined, undefined, undefined, undefined, undefined]);
              }
              const songIdx = this.songId === undefined ? -1 : allSongs.findIndex(song => song.id === this.songId);
              const prevSongIdx = songIdx === -1 ? allSongs.length - 1 : songIdx - 1;
              const prevSong = prevSongIdx === -1 ? undefined : allSongs[prevSongIdx];
              const nextSongIdx = songIdx === -1 ? 0 : songIdx + 1;
              const nextSong = nextSongIdx >= allSongs.length ? undefined : allSongs[nextSongIdx];
              return combineLatest([
                of(collection),
                of(prevSong),
                prevSong ? this.cds.getCollectionById(prevSong.collectionId) : of(undefined),
                of(nextSong),
                nextSong ? this.cds.getCollectionById(nextSong.collectionId) : of(undefined),
              ]);
            }),
            takeUntil(this.destroyed$),
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
            this.prevLink = getCollectionPageLink(collection);
            this.prevLinkIsCollection = true;
          }
          // noinspection DuplicatedCode
          if (nextSong && nextSongPrimaryCollection) {
            this.nextLink = getSongPageLink(collection.mount, nextSong.mount, nextSongPrimaryCollection.mount);
            this.nextLinkIsCollection = false;
          } else {
            this.nextLink = getCollectionPageLink(collection);
            this.nextLinkIsCollection = true;
          }
          if (this.isInitializing) {
            this.isInitializing = false;
            this.updateMobileControls(true);
          }
        });
  }

  ngOnDestroy(): void {
    this.unsubscribeHammer();
    this.destroyed$.next();
  }

  private updateMobileControls(forceUpdate = false): void {
    const isWideScreenMode = window.innerWidth >= MIN_DESKTOP_WIDTH;
    if (forceUpdate || this.isWideScreenMode !== isWideScreenMode) {
      this.unsubscribeHammer();
      if (this.bss.isBrowser && !isWideScreenMode && isTouchEventsSupportAvailable()) {
        delete Hammer.defaults.cssProps.userSelect; // to allow selection
        this.hammer = new Hammer(window.document.body, {
          touchAction: 'auto',
          inputClass: Hammer['SUPPORT_POINTER_EVENTS'] ? Hammer.PointerEventInput : Hammer.TouchMouseInput,
          recognizers: [[Hammer.Swipe, {direction: Hammer.DIRECTION_HORIZONTAL}]],
        });
        this.hammer.on('swiperight', () => this.navigate(this.prevLink));
        this.hammer.on('swipeleft', () => this.navigate(this.nextLink));
      }

      this.isWideScreenMode = isWideScreenMode;
      this.cd.detectChanges();
    }
  }

  private unsubscribeHammer(): void {
    if (this.hammer) {
      this.hammer.destroy();
      delete this.hammer;
    }
  }

  @HostListener('window:resize', [])
  onWindowResize() {
    this.updateMobileControls();
  }

  navigate(link: string|undefined): void {
    if (link) {
      this.router.navigate([link]).catch(err => console.error(err));
    }
  }
}
