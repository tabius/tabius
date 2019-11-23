import {AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, Input, OnDestroy, OnInit} from '@angular/core';
import {CatalogDataService} from '@app/services/catalog-data.service';
import {combineLatest, of, Subject} from 'rxjs';
import {flatMap, map, takeUntil} from 'rxjs/operators';
import {combineLatest0, defined, getSongPageLink, isTouchEventsSupportAvailable, sortSongsAlphabetically} from '@common/util/misc-utils';
import {BrowserStateService} from '@app/services/browser-state.service';
import {Router} from '@angular/router';
import {MIN_DESKTOP_WIDTH} from '@common/constants';

const Hammer: HammerStatic = require('hammerjs');

@Component({
  selector: 'gt-song-prev-next-navigator',
  templateUrl: './song-prev-next-navigator.component.html',
  styleUrls: ['./song-prev-next-navigator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongPrevNextNavigatorComponent implements OnInit, AfterViewInit, OnDestroy {

  private readonly destroyed$ = new Subject();

  @Input() songId!: number;
  @Input() activeCollectionId?: number;

  prevLink?: string;
  nextLink?: string;

  showStickySideBars: 'initializing'|'yes'|'no' = 'initializing';

  private hammer?: HammerManager;

  constructor(private readonly cds: CatalogDataService,
              private readonly cd: ChangeDetectorRef,
              private readonly bss: BrowserStateService,
              private readonly router: Router,
  ) {
  }

  ngOnInit(): void {
    const collection$ = !!this.activeCollectionId ?
        this.cds.getCollectionById(this.activeCollectionId) :
        this.cds.getSongById(this.songId).pipe(flatMap(song => song ? this.cds.getCollectionById(song.collectionId) : of(undefined)));
    // list of all collection songs sorted by id.
    const allSongs$ = collection$.pipe(
        flatMap(collection => collection ? this.cds.getCollectionSongList(collection.id) : of([])),
        flatMap(songIds => combineLatest0((songIds || []).map(id => this.cds.getSongById(id)))),
        map(songs => sortSongsAlphabetically(songs.filter(defined))),
    );
    combineLatest([collection$, allSongs$])
        .pipe(
            takeUntil(this.destroyed$),
            flatMap(([collection, allSongs]) => {
              const notFound = [undefined, undefined, undefined, undefined, undefined];
              if (!collection || !allSongs || allSongs.length === 0) {
                return of(notFound);
              }
              const songIdx = allSongs.findIndex(song => song.id === this.songId);
              if (songIdx < 0) {
                return of(notFound);
              }
              const nextSongIdx = (songIdx + 1) % allSongs.length;
              const prevSongIdx = (songIdx + allSongs.length - 1) % allSongs.length;
              const prevSong = allSongs[prevSongIdx];
              const nextSong = allSongs[nextSongIdx];
              return combineLatest([
                of(collection),
                of(prevSong),
                this.cds.getCollectionById(prevSong.collectionId),
                of(nextSong),
                this.cds.getCollectionById(nextSong.collectionId),
              ]);
            })
        )
        .subscribe(([collection, prevSong, prevSongPrimaryCollection, nextSong, nextSongPrimaryCollection]) => {
          if (!collection || !prevSong || !nextSong || !prevSongPrimaryCollection || !nextSongPrimaryCollection) {
            return;
          }
          this.prevLink = getSongPageLink(collection.mount, prevSong.mount, prevSongPrimaryCollection.mount);
          this.nextLink = getSongPageLink(collection.mount, nextSong.mount, nextSongPrimaryCollection.mount);
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
