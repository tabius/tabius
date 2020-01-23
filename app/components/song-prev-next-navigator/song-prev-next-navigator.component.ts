import {AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, Input, OnDestroy, OnInit} from '@angular/core';
import {CatalogService} from '@app/services/catalog.service';
import {combineLatest, Observable, of, Subject} from 'rxjs';
import {flatMap, map, takeUntil} from 'rxjs/operators';
import {combineLatest0, defined, findParentOrSelfWithClass, getCollectionPageLink, getSongPageLink, isElementToIgnoreKeyEvent, isTouchEventsSupportAvailable, sortSongsAlphabetically} from '@common/util/misc-utils';
import {BrowserStateService} from '@app/services/browser-state.service';
import {Router} from '@angular/router';
import {MIN_DESKTOP_WIDTH} from '@common/common-constants';
import {Collection, Song} from '@common/catalog-model';
import {I18N} from '@app/app-i18n';
import {ShortcutsService} from '@app/services/shortcuts.service';

const Hammer: HammerStatic = require('hammerjs');

@Component({
  selector: 'gt-song-prev-next-navigator',
  templateUrl: './song-prev-next-navigator.component.html',
  styleUrls: ['./song-prev-next-navigator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongPrevNextNavigatorComponent implements OnInit, AfterViewInit, OnDestroy {

  private readonly destroyed$ = new Subject();

  readonly i18n = I18N.songPrevNextNavigator;

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
              private readonly ss: ShortcutsService,
  ) {
  }

  // TODO: handle changes & re-subscribe!
  ngOnInit(): void {
    this.updateViewDimensions();
    const collection$ = this.cds.getCollectionById(this.activeCollectionId);
    const allSongs$ = getAllSongsInCollectionsSorted(collection$, this.cds);
    combineLatest([collection$, allSongs$])
        .pipe(
            flatMap(([collection, allSongs]) => {
              if (!collection || !allSongs || allSongs.length === 0) {
                return of([undefined, undefined, undefined, undefined, undefined]);
              }
              const {prevSong, nextSong} = findPrevAndNextSongs(this.songId, allSongs);
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
          this.isInitializing = false;
          this.cd.detectChanges();
        });
  }

  ngAfterViewInit(): void {
    this.installHammer();
  }

  ngOnDestroy(): void {
    this.uninstallHammer();
    this.destroyed$.next();
  }

  private updateViewDimensions(): void {
    this.isWideScreenMode = window.innerWidth >= MIN_DESKTOP_WIDTH;
  }

  private installHammer(): void {
    this.uninstallHammer();
    if (this.bss.isBrowser && isTouchEventsSupportAvailable()) {
      delete Hammer.defaults.cssProps.userSelect; // to allow selection
      this.hammer = new Hammer(window.document.body, {
        // touchAction: 'auto',
        // inputClass: Hammer['SUPPORT_POINTER_EVENTS'] ? Hammer.PointerEventInput : Hammer.TouchMouseInput,
        recognizers: [[Hammer.Swipe, {direction: Hammer.DIRECTION_HORIZONTAL}]],
      });
      this.hammer.on('swiperight', () => this.navigate(this.prevLink));
      this.hammer.on('swipeleft', () => this.navigate(this.nextLink));
    }
  }

  private uninstallHammer(): void {
    if (this.hammer) {
      this.hammer.destroy();
      delete this.hammer;
    }
  }

  @HostListener('window:resize', [])
  onWindowResize() {
    this.updateViewDimensions();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.shiftKey && !isElementToIgnoreKeyEvent(event.target as HTMLElement)) {
      if (event.code === 'ArrowLeft') {
        this.navigate(this.prevLink);
      } else if (event.code === 'ArrowRight') {
        this.navigate(this.nextLink);
      }
    }
  }

  navigate(link: string|undefined): void {
    if (link) {
      this.router.navigate([link]).catch(err => console.error(err));
    }
  }

  onBarNavigationClick(event: MouseEvent, link: string): void {
    const clickedEl = event.target as HTMLElement;
    //TODO: do not use (click) inside (click)
    if (findParentOrSelfWithClass(clickedEl, 'random-song-link')) { // ignore -> this click will be handled separately
      return;
    }
    this.navigate(link);
  }

  gotoRandomSongInCatalog(): void {
    this.ss.gotoRandomSong();
  }

  gotoRandomSongInCollection(): void {
    this.ss.gotoRandomSong(this.activeCollectionId);
  }
}

export function getAllSongsInCollectionsSorted(collection$: Observable<Collection|undefined>, cds: CatalogService) {
  // list of all collection songs sorted by id.
  return collection$.pipe(
      flatMap(collection => collection ? cds.getSongIdsByCollection(collection.id) : of([])),
      flatMap(songIds => combineLatest0((songIds || []).map(id => cds.getSongById(id)))),
      map(songs => sortSongsAlphabetically(songs.filter(defined))),
  );
}

export function findPrevAndNextSongs(songId: number|undefined, allSongs: Song[], title?: string): { prevSong?: Song, nextSong?: Song } {
  let songIdx = songId === undefined ? -1 : allSongs.findIndex(song => song.id === songId);
  if (songIdx === -1 && !!title) {
    for (songIdx = 0; songIdx < allSongs.length - 1; songIdx++) {
      if (allSongs[songIdx + 1].title.localeCompare(title) >= 0) {
        break;
      }
    }
  }
  const prevSongIdx = songIdx === -1 ? allSongs.length - 1 : songIdx - 1;
  const prevSong = prevSongIdx === -1 ? undefined : allSongs[prevSongIdx];
  const nextSongIdx = songIdx === -1 ? 0 : songIdx + 1;
  const nextSong = nextSongIdx >= allSongs.length ? undefined : allSongs[nextSongIdx];
  return {prevSong, nextSong};
}

