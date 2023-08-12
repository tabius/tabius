import {AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, Input, OnDestroy, OnInit} from '@angular/core';
import {CatalogService} from '@app/services/catalog.service';
import {combineLatest, Observable, of, Subject} from 'rxjs';
import {map, mergeMap, takeUntil} from 'rxjs/operators';
import {combineLatest0, findParentOrSelfWithClass, getCollectionPageLink, getSongPageLink, isDefined, isElementToIgnoreKeyEvent, isTouchDevice, sortSongsAlphabetically} from '@common/util/misc-utils';
import {BrowserStateService} from '@app/services/browser-state.service';
import {Router} from '@angular/router';
import {Collection, Song} from '@common/catalog-model';
import {I18N} from '@app/app-i18n';
import {ShortcutsService} from '@app/services/shortcuts.service';

import * as Hammer from 'hammerjs';

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
  @Input({required: true}) activeCollectionId!: number;

  prevLink = '';
  prevLinkIsCollection = false;
  nextLink = '';
  nextLinkIsCollection = false;

  private activeCollectionMount?: string;

  isInitializing = true;

  private hammer?: HammerManager;

  constructor(private readonly cds: CatalogService,
              private readonly cd: ChangeDetectorRef,
              readonly bss: BrowserStateService,
              private readonly router: Router,
              private readonly shortcutsService: ShortcutsService,
  ) {
  }

  // TODO: handle changes & re-subscribe!
  ngOnInit(): void {
    const collection$ = this.cds.getCollectionById(this.activeCollectionId);
    const allSongs$ = getAllSongsInCollectionsSorted(collection$, this.cds);
    combineLatest([collection$, allSongs$])
        .pipe(
            mergeMap(([collection, allSongs]) => {
              if (!collection || !allSongs || allSongs.length === 0) {
                return of([undefined, undefined, undefined, undefined, undefined]);
              }
              const {prevSong, nextSong} = this.songId
                                           ? findPrevAndNextSongs(this.songId, allSongs)
                                           : {prevSong: allSongs[allSongs.length - 1], nextSong: allSongs[0]};
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
          this.activeCollectionMount = collection?.mount;
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
    this.destroyed$.next(true);
  }

  private installHammer(): void {
    this.uninstallHammer();
    if (this.bss.isBrowser && isTouchDevice()) {
      Hammer.defaults.cssProps.userSelect = 'auto';
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

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.shortcutsService.isDoubleShiftRightPressEvent) {
      this.gotoRandomSongInCollection();
      return;
    }

    if (event.shiftKey && !isElementToIgnoreKeyEvent(event.target as HTMLElement)) {
      switch (event.code) {
        case 'ArrowLeft':
          this.navigate(this.prevLink);
          break;
        case 'ArrowRight':
          this.navigate(this.nextLink);
          break;
        case 'PageUp': // Shift + PageUp work only on the song page and navigates up to the collection level.
          if (this.activeCollectionMount && this.songId) {
            this.navigate(getCollectionPageLink(this.activeCollectionMount));
          }
          break;
        case 'PageDown':
          if (!this.songId) { // Shift + PageDown work only on the collection page and navigates down to the song level.
            this.navigate(this.nextLink);
          }
          break;
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

  gotoRandomSongInCatalog(event?: MouseEvent): void {
    this.shortcutsService.gotoRandomSong();
    stopAndPreventDefaultOnRandomSongButtonClick(event);
  }

  gotoRandomSongInCollection(event?: MouseEvent): void {
    if (!!this.activeCollectionId) {
      this.shortcutsService.gotoRandomSong(this.activeCollectionId);
    }
    stopAndPreventDefaultOnRandomSongButtonClick(event);
  }
}

export function getAllSongsInCollectionsSorted(collection$: Observable<Collection|undefined>, cds: CatalogService): Observable<Array<Song>> {
  // list of all collection songs sorted by id.
  return collection$.pipe(
      mergeMap(collection => collection ? cds.getSongIdsByCollection(collection.id) : of([])),
      mergeMap(songIds => combineLatest0((songIds || []).map(id => cds.getSongById(id)))),
      map(songs => sortSongsAlphabetically(songs.filter(isDefined))),
  );
}

export function findPrevAndNextSongs(songId: number, allSongs: Song[], title?: string): { prevSong?: Song, nextSong?: Song } {
  let songIdx = songId === undefined ? -1 : allSongs.findIndex(song => song.id === songId);
  if (songIdx === -1 && !!title) {
    for (songIdx = 0; songIdx < allSongs.length - 1; songIdx++) {
      const nextSong = allSongs[songIdx + 1];
      if (nextSong.title.localeCompare(title) >= 0) {
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


// On Android the button text is selected and 'Search' footer appears.
// Preventing default to prevent this unwanted behavior.
function stopAndPreventDefaultOnRandomSongButtonClick(event: MouseEvent|undefined): void {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
}

