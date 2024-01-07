import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { CatalogService } from '@app/services/catalog.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Collection, Song, SongDetails } from '@common/catalog-model';
import { BehaviorSubject, combineLatest, firstValueFrom } from 'rxjs';
import { map, switchMap, take, throttleTime } from 'rxjs/operators';
import { switchToNotFoundMode } from '@app/utils/component-utils';
import { UserService } from '@app/services/user.service';
import {
  canManageCollectionContent,
  getNameFirstFormArtistName,
  getSongPageLink,
  isInputEvent,
  nothingThen,
  scrollToView,
  scrollToViewByEndPos,
} from '@common/util/misc-utils';
import { parseChordsLine } from '@common/util/chords-parser';
import { RoutingNavigationHelper } from '@app/services/routing-navigation-helper.service';
import {
  MOUNT_COLLECTION_PREFIX,
  MOUNT_STUDIO,
  PARAM_COLLECTION_MOUNT,
  PARAM_PRIMARY_COLLECTION_MOUNT,
  PARAM_SONG_MOUNT,
} from '@common/mounts';
import { getCollectionImageUrl, getFullLink } from '@app/utils/url-utils';
import { getToneWithH4SiFix, TONES_COUNT } from '@common/util/chords-renderer';
import { getDefaultUserSongFontSize, User, UserDeviceSettings, UserSongSettings } from '@common/user-model';
import { HelpService } from '@app/services/help.service';
import { ComponentWithLoadingIndicator } from '@app/utils/component-with-loading-indicator';
import {
  findPrevAndNextSongs,
  getAllSongsInCollectionsSorted,
} from '@app/components/song-prev-next-navigator/song-prev-next-navigator.component';
import { I18N } from '@app/app-i18n';
import { ShortcutsService } from '@app/services/shortcuts.service';
import { SONG_TEXT_COMPONENT_NAME } from '@app/components/song-text/song-text.component';
import { ContextMenuActionService } from '@app/services/context-menu-action.service';
import { MAX_SONG_FONT_SIZE, MIN_SONG_FONT_SIZE } from '@app/components/settings-page/settings-page.component';
import { getSongKey } from '@common/util/key-detector';
import { ChordTone } from '@common/util/chords-lib';
import { getTransposeActionKey, updateUserSongSetting } from '@app/components/song-chords/song-chords.component';
import { BreadcrumbList, WithContext } from 'schema-dts';
import { getSongJsonLdBreadcrumbList } from '@common/util/json-ld';
import { MIN_DESKTOP_WIDTH } from '@common/common-constants';
import { assertTruthy } from 'assertic';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { buildAffiliateLink, HAS_AFFILIATE_SUPPORT } from '@app/utils/affiliate-utils';

@Component({
  templateUrl: './song-page.component.html',
  styleUrls: ['./song-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongPageComponent extends ComponentWithLoadingIndicator implements OnDestroy {
  readonly i18n = I18N.songPage;

  song?: Song;
  songDetails?: SongDetails;
  activeCollection?: Collection;
  primaryCollection?: Collection;
  songSettings?: UserSongSettings;
  canonicalPageUrl?: string;
  user?: User;
  deviceSettings?: UserDeviceSettings;

  hasEditRight = false;
  editorIsOpen = false;
  private isUserCollection = false;

  notFound = false;

  songMountBeforeUpdate?: string;
  collectionMount?: string;

  originalSongKey?: ChordTone;
  transposeActionKey?: ChordTone;
  transposeMenuActionText$ = new BehaviorSubject<string | undefined>(undefined);

  jsonLdBreadcrumb?: WithContext<BreadcrumbList>;

  affiliateSongLink?: string;

  constructor(
    private readonly catalogService: CatalogService,
    private readonly uds: UserService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly navHelper: RoutingNavigationHelper,
    private readonly helpService: HelpService,
    private readonly shortcutsService: ShortcutsService,
    private readonly elementRef: ElementRef,
    private readonly contextMenuActionService: ContextMenuActionService,
  ) {
    super();
    this.helpService.setActiveHelpPage('song');
    const params = this.route.snapshot.params;
    this.collectionMount = params[PARAM_COLLECTION_MOUNT];
    let primaryCollectionMount = params[PARAM_PRIMARY_COLLECTION_MOUNT];
    const songMount = params[PARAM_SONG_MOUNT];

    if (this.collectionMount === primaryCollectionMount) {
      this.loaded = true;
      switchToNotFoundMode(this); // TODO: use permanent redirect to the primary song page?
      return;
    }

    this.setupContextMenuActions();

    if (primaryCollectionMount === undefined) {
      primaryCollectionMount = this.collectionMount;
    }
    const collectionId$ = this.catalogService.getCollectionIdByMount(this.collectionMount);
    const primaryCollectionId$ = this.catalogService.getCollectionIdByMount(primaryCollectionMount);
    const collection$ = collectionId$.pipe(switchMap(id => this.catalogService.observeCollection(id)));
    const primaryCollection$ = primaryCollectionId$.pipe(switchMap(id => this.catalogService.observeCollection(id)));
    const allSongsInCollection$ = collection$.pipe(switchMap(c => this.catalogService.getSongIdsByCollection(c?.id)));
    const songInCollection$ = combineLatest([collectionId$, primaryCollectionId$]).pipe(
      switchMap(([collectionId, primaryCollectionId]) =>
        this.catalogService.getSongByMount(collectionId, primaryCollectionId, songMount),
      ),
    );
    // Reuse cached song to keep showing the page if the song was moved out of the current collection.
    const song$ = songInCollection$.pipe(map(song => song || this.song));
    const songDetails$ = song$.pipe(switchMap(song => this.catalogService.getSongDetailsById(song?.id)));
    const songSettings$ = song$.pipe(switchMap(song => this.uds.getUserSongSettings(song && song.id)));
    const user$ = this.uds.getUser$();
    const h4Si$ = this.uds.getH4SiFlag();
    const favoriteKey$ = this.uds.getFavoriteKey();

    const songData$ = combineLatest([collection$, primaryCollection$, song$, songDetails$, allSongsInCollection$]);
    const userData$ = combineLatest([user$, h4Si$, favoriteKey$, songSettings$]);
    combineLatest([songData$, userData$])
      .pipe(throttleTime(100, undefined, { leading: true, trailing: true }), takeUntilDestroyed())
      .subscribe(
        ([[collection, primaryCollection, song, songDetails, allSongsInCollection], [user, h4Si, favoriteKey, songSettings]]) => {
          this.loaded = true;
          this.cdr.markForCheck();
          this.isUserCollection = !!user && !!collection && user.collectionId === collection.id;
          const hadSongBefore = this.song !== undefined;
          const haveSongNow = song !== undefined && songDetails !== undefined;
          const isSongMountUpdated = !!this.songMountBeforeUpdate && song?.mount !== this.songMountBeforeUpdate;
          const isInvalidSongCollection = song && collection && !(allSongsInCollection || []).includes(song.id);
          if ((hadSongBefore && !haveSongNow) || isSongMountUpdated || isInvalidSongCollection) {
            // Handle song removal or mount update or song move.
            if (isSongMountUpdated) {
              this.handleMountUpdate();
            } else {
              this.handleSongRemovalFromCatalog();
            }
            return;
          }
          if (collection === undefined || primaryCollection === undefined || song === undefined || songDetails === undefined) {
            switchToNotFoundMode(this);
            return;
          }
          this.song = song;
          this.songDetails = songDetails;
          this.activeCollection = collection;
          this.primaryCollection = primaryCollection;
          this.user = user;
          this.songSettings = songSettings;

          this.originalSongKey = getSongKey(this.songDetails);
          this.transposeActionKey = getTransposeActionKey(this.originalSongKey, favoriteKey, songSettings.transpose);
          this.transposeMenuActionText$.next(
            this.transposeActionKey ? `${getToneWithH4SiFix(h4Si, this.transposeActionKey)}m` : undefined,
          );

          this.jsonLdBreadcrumb = getSongJsonLdBreadcrumbList(this.activeCollection, this.song, this.primaryCollection);
          this.affiliateSongLink =
            !HAS_AFFILIATE_SUPPORT || !primaryCollection.listed ? undefined : buildAffiliateLink(this.primaryCollection.name);

          this.updateMeta();
          this.hasEditRight = canManageCollectionContent(user, primaryCollection);
          this.registerStateInCatalogNavigationHistory();
          this.navHelper.restoreScrollPosition();
        },
      );

    this.uds
      .getUserDeviceSettings()
      .pipe(takeUntilDestroyed())
      .subscribe(deviceSettings => {
        this.deviceSettings = deviceSettings;
      });
  }

  private setupContextMenuActions(): void {
    this.contextMenuActionService.footerActions$.next([
      {
        icon: 'note',
        target: [
          { icon: 'arrow-down', target: () => this.transpose(-1), style: { 'width.px': 18 } },
          { icon: 'arrow-up', target: () => this.transpose(1), style: { 'width.px': 18 } },
          { icon: 'reset', target: () => this.transpose(0), style: { 'width.px': 18 } },
          { text$: this.transposeMenuActionText$, target: () => this.transposeToKey(), textStyle: { 'font-size.px': 16 } },
        ],
        style: { 'width.px': 18 },
      },
      { icon: 'minus', target: () => this.decFontSize(), style: { 'width.px': 18 } },
      { icon: 'plus', target: () => this.incFontSize(), style: { 'width.px': 18 } },
      {
        icon: 'dice4',
        target: [
          {
            icon: 'dice4',
            text: this.i18n.gotoRandomSongInCatalogMenu,
            target: () => this.shortcutsService.gotoRandomSong(),
          },
          {
            icon: 'dice4',
            text: this.i18n.gotoRandomSongInCollectionMenu,
            target: () => {
              if (this.activeCollection && this.activeCollection.id) {
                this.shortcutsService.gotoRandomSong(this.activeCollection.id);
              }
            },
          },
        ],
        style: { 'width.px': 22 },
      },
    ]);
  }

  /** Called when currently song mount is updated. */
  private handleMountUpdate(): void {
    if (!this.collectionMount || !this.songMountBeforeUpdate) {
      return;
    }
    const params = this.route.snapshot.params;
    const link = getSongPageLink(this.collectionMount, this.songMountBeforeUpdate, params[PARAM_PRIMARY_COLLECTION_MOUNT]);
    this.router.navigate([link]).catch(err => console.error(err));
  }

  /** Navigates to some other page when the visible song is removed from the catalog. */
  private handleSongRemovalFromCatalog(): void {
    // Try to go to the next or prev song in the current collection. Fall-back to collection/studio page.
    this.catalogService
      .getCollectionIdByMount(this.collectionMount)
      .pipe(
        switchMap(collectionId => this.catalogService.observeCollection(collectionId)),
        switchMap(collection => getAllSongsInCollectionsSorted(collection, this.catalogService)),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(async songs => {
        const { collectionMount, song } = this;
        const { prevSong, nextSong } = song
          ? findPrevAndNextSongs(song.id, songs, song.title)
          : { prevSong: undefined, nextSong: undefined };
        const targetSong = nextSong || prevSong;
        const targetSongPrimaryCollection = targetSong
          ? await firstValueFrom(this.catalogService.observeCollection(targetSong.collectionId))
          : undefined;
        if (targetSong && collectionMount && targetSongPrimaryCollection) {
          const link = getSongPageLink(collectionMount, targetSong.mount, targetSongPrimaryCollection.mount);
          this.router.navigate([link]).catch(err => console.error(err));
        } else if (this.isUserCollection) {
          this.router.navigate([MOUNT_STUDIO]).catch(err => console.error(err));
        } else {
          this.router.navigate([MOUNT_COLLECTION_PREFIX + this.collectionMount!]).catch(err => console.error(err));
        }
      });
  }

  ngOnDestroy(): void {
    this.contextMenuActionService.footerActions$.next([]);
  }

  updateMeta(): void {
    if (!this.song || !this.activeCollection || !this.songDetails || !this.primaryCollection) {
      return;
    }
    this.canonicalPageUrl = getFullLink(getSongPageLink(this.primaryCollection.mount, this.song.mount));
    const titlePrefix = `${this.song.title}, ${getNameFirstFormArtistName(this.activeCollection)} | `;
    const titleSuffix = this.i18n.titleSuffix(titlePrefix);
    this.updatePageMetadata({
      title: titlePrefix + titleSuffix,
      description: getSongTextWithNoChords(this.songDetails.content, 5, true),
      keywords: this.i18n.keywords(this.activeCollection.name, this.song.title),
      image: getCollectionImageUrl(this.activeCollection.mount),
    });
  }

  @HostListener('window:keydown', ['$event'])
  keyEvent(event: KeyboardEvent): void {
    if (isInputEvent(event)) {
      return;
    }
    if (this.shortcutsService.isDoubleControlRightPressEvent) {
      scrollToView(this.getSongTextElement());
      return;
    }

    if (!this.editorIsOpen && event.shiftKey && event.code === 'KeyE') {
      this.openEditor();
      return;
    }

    // Key codes with or with no SHIFT.
    switch (event.code) {
      case 'Underscore': // Same button with 'Minus' on laptop keyboard.
      case 'Minus':
        this.decFontSize();
        return;
      case 'Equal': // Same button with 'Plus' on laptop keyboard.
      case 'Plus':
        this.incFontSize();
        return;
      case 'Digit0':
        this.updateSongFontSize(getDefaultUserSongFontSize()).then();
        return;
    }

    // Key codes with SHIFT only.
    if (!event.shiftKey) {
      return;
    }
    switch (event.code) {
      case 'ArrowDown':
        this.transpose(-1).then();
        return;
      case 'ArrowUp':
        this.transpose(1).then();
        return;
      case 'Digit0':
        this.transpose(0).then();
        return;
      case 'BracketLeft':
      case 'BracketRight':
        const songTextEl = this.getSongTextElement();
        if (event.code === 'BracketLeft') {
          scrollToView(songTextEl);
        } else {
          scrollToViewByEndPos(songTextEl);
        }
        return;
    }
  }

  private getSongTextElement(): HTMLElement | undefined {
    return (this.elementRef.nativeElement as HTMLElement).querySelector(SONG_TEXT_COMPONENT_NAME) as HTMLElement | undefined;
  }

  openEditor(): void {
    this.editorIsOpen = true;
  }

  closeEditor(): void {
    this.editorIsOpen = false;
  }

  async transpose(steps: number): Promise<void> {
    if (this.songSettings) {
      const transpose = steps === 0 ? 0 : (this.songSettings!.transpose + steps) % TONES_COUNT;
      await this.uds.setUserSongSettings({ ...this.songSettings!, transpose });
    }
  }

  transposeToKey(): void {
    updateUserSongSetting(this.originalSongKey, this.transposeActionKey, this.songSettings, this.uds);
  }

  incFontSize(): void {
    if (this.deviceSettings) {
      this.updateSongFontSize(Math.min(this.deviceSettings.songFontSize + 1, MAX_SONG_FONT_SIZE)).then();
    }
  }

  decFontSize(): void {
    if (this.deviceSettings) {
      this.updateSongFontSize(Math.max(this.deviceSettings.songFontSize - 1, MIN_SONG_FONT_SIZE)).then();
    }
  }

  private async updateSongFontSize(songFontSize: number): Promise<void> {
    if (this.deviceSettings) {
      await this.uds.setUserDeviceSettings({ ...this.deviceSettings, songFontSize });
    }
  }

  onMountChangeBeforeUpdate(mountBeforeUpdate: string): void {
    this.songMountBeforeUpdate = mountBeforeUpdate;
  }

  private registerStateInCatalogNavigationHistory(): void {
    if (!this.song || !this.activeCollection) {
      return;
    }
    const name = this.song.title;
    const artist = getNameFirstFormArtistName(this.activeCollection);
    const url = getSongPageLink(this.activeCollection.mount, this.song.mount, this.primaryCollection?.mount);
    this.uds.addCatalogNavigationHistoryStep({ name, collection: artist, url }).then(nothingThen);
  }

  get isSearchVideoOnYoutubeLinkVisible(): boolean {
    const width = typeof window === 'object' && window.innerWidth;
    if (!width) {
      return false;
    }
    return width >= MIN_DESKTOP_WIDTH && !!this.song && !!this.primaryCollection;
  }

  get youtubeSearchSongLink(): string {
    assertTruthy(this.song && this.primaryCollection);
    const encodedQuery = encodeURIComponent(`${this.song.title} ${this.primaryCollection.name}`);
    return `https://www.youtube.com/results?search_query=${encodedQuery}`;
  }
}

//TODO: move to utils
/** Returns first 'lineCount' lines of the song. */
export function getSongTextWithNoChords(text: string, linesCount: number, mergeLines: boolean): string {
  let result = '';
  let linesFound = 0;
  let position = 0;
  const isServiceLineChar = (c: string): boolean => c === '{' || c === '}' || c === '(' || c === ')' || c === '[' || c === ']';

  while (linesFound < linesCount) {
    const newPosition = text.indexOf('\n', position + 1);
    if (newPosition === -1) {
      break;
    }
    const chords = parseChordsLine(text, position, newPosition);
    if (chords.length === 0) {
      // do more validation for the line.
      let serviceLine = false;
      for (let idx = position; idx < newPosition && !serviceLine; idx++) {
        const c = text.charAt(idx);
        serviceLine = isServiceLineChar(c) || text.startsWith('--', idx);
      }
      if (!serviceLine) {
        linesFound++;
        if (!mergeLines && result.length > 0) {
          result += '\n';
        }
        result += (linesFound > 1 ? ' ' : '') + text.substring(position, newPosition);
      }
    }
    position = newPosition + 1;
  }
  return result;
}
