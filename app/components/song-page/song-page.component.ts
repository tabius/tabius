import {ChangeDetectionStrategy, Component, ElementRef, HostListener, Injector, OnDestroy, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {CatalogService} from '@app/services/catalog.service';
import {ActivatedRoute, Router} from '@angular/router';
import {Collection, Song, SongDetails} from '@common/catalog-model';
import {combineLatest, of} from 'rxjs';
import {mergeMap, take, takeUntil, throttleTime} from 'rxjs/operators';
import {switchToNotFoundMode} from '@app/utils/component-utils';
import {Meta, Title} from '@angular/platform-browser';
import {updatePageMetadata} from '@app/utils/seo-utils';
import {UserService} from '@app/services/user.service';
import {canManageCollectionContent, getFullLink, getNameFirstFormArtistName, getSongPageLink, hasValidForumTopic, isInputEvent, scrollToView, scrollToViewByEndPos} from '@common/util/misc-utils';
import {parseChordsLine} from '@app/utils/chords-parser';
import {RoutingNavigationHelper} from '@app/services/routing-navigation-helper.service';
import {MOUNT_COLLECTION_PREFIX, MOUNT_STUDIO, PARAM_COLLECTION_MOUNT, PARAM_PRIMARY_COLLECTION_MOUNT, PARAM_SONG_MOUNT} from '@common/mounts';
import {getCollectionImageUrl, getSongForumTopicLink} from '@app/utils/url-utils';
import {TONES_COUNT} from '@app/utils/chords-renderer';
import {User, UserDeviceSettings, UserSongSettings} from '@common/user-model';
import {HelpService} from '@app/services/help.service';
import {ComponentWithLoadingIndicator} from '@app/utils/component-with-loading-indicator';
import {findPrevAndNextSongs, getAllSongsInCollectionsSorted} from '@app/components/song-prev-next-navigator/song-prev-next-navigator.component';
import {I18N} from '@app/app-i18n';
import {ShortcutsService} from '@app/services/shortcuts.service';
import {SONG_TEXT_COMPONENT_NAME} from '@app/components/song-text/song-text.component';
import {ContextMenuActionService} from '@app/services/context-menu-action.service';
import {MAX_SONG_FONT_SIZE, MIN_SONG_FONT_SIZE} from '@app/components/settings-page/settings-page.component';

@Component({
  selector: 'gt-song-page',
  templateUrl: './song-page.component.html',
  styleUrls: ['./song-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongPageComponent extends ComponentWithLoadingIndicator implements OnInit, OnDestroy {

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

  readonly hasValidForumTopic = hasValidForumTopic;
  readonly getSongForumTopicLink = getSongForumTopicLink;

  notFound = false;

  songMountBeforeUpdate?: string;
  collectionMount?: string;

  constructor(private readonly cds: CatalogService,
              private readonly uds: UserService,
              private readonly router: Router,
              private readonly route: ActivatedRoute,
              readonly title: Title,
              readonly meta: Meta,
              private readonly navHelper: RoutingNavigationHelper,
              private readonly helpService: HelpService,
              private readonly shortcutsService: ShortcutsService,
              private readonly elementRef: ElementRef,
              private readonly contextMenuActionService: ContextMenuActionService,
              injector: Injector,
  ) {
    super(injector);
  }

  ngOnInit() {
    this.helpService.setActiveHelpPage('song');
    if (this.isBrowser) {
      this.uds.syncSessionStateAsync(); //TODO: find a better place to do it for every page. Sync state every N seconds??
    }

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
    const collectionId$ = this.cds.getCollectionIdByMount(this.collectionMount);
    const primaryCollectionId$ = this.cds.getCollectionIdByMount(primaryCollectionMount);
    const collection$ = collectionId$.pipe(mergeMap(id => this.cds.getCollectionById(id)));
    const primaryCollection$ = primaryCollectionId$.pipe(mergeMap(id => this.cds.getCollectionById(id)));
    const song$ = collectionId$.pipe(mergeMap(collectionId => this.cds.getSongByMount(collectionId, songMount)));
    const songDetails$ = song$.pipe(mergeMap(song => this.cds.getSongDetailsById(song && song.id)));

    combineLatest([collection$, primaryCollection$, song$, songDetails$, this.uds.getUser()])
        .pipe(
            throttleTime(100, undefined, {leading: true, trailing: true}),
            takeUntil(this.destroyed$),
        )
        .subscribe(([collection, primaryCollection, song, songDetails, user]) => {
          this.loaded = true;
          this.isUserCollection = !!user && !!collection && user.collectionId === collection.id;
          const hadSongBefore = this.song !== undefined;
          const haveSongNow = song !== undefined && songDetails !== undefined;
          if (hadSongBefore && !haveSongNow) {
            // handle song removal or mount update
            if (!!this.songMountBeforeUpdate && this.songMountBeforeUpdate !== songMount) {
              this.handleMountUpdate();
            } else {
              this.handleSongRemoval();
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
          this.updateMeta();
          this.hasEditRight = canManageCollectionContent(user, primaryCollection);
          this.cd.detectChanges();
          this.navHelper.restoreScrollPosition();
        });

    song$.pipe(mergeMap(song => song ? this.uds.getUserSongSettings(song.id) : of(undefined)),
        takeUntil(this.destroyed$)
    ).subscribe(songSettings => {
      this.songSettings = songSettings;
    });

    this.uds.getUserDeviceSettings()
        .pipe(takeUntil(this.destroyed$))
        .subscribe(deviceSettings => {
          this.deviceSettings = deviceSettings;
        });
  }

  private setupContextMenuActions() {
    this.contextMenuActionService.footerActions$.next([
      {icon: 'arrow-down', target: () => this.transpose(-1), style: {'width.px': 18}},
      {icon: 'arrow-up', target: () => this.transpose(+1), style: {'width.px': 18}},
      {icon: 'minus', target: () => this.decFontSize(), style: {'width.px': 18}},
      {icon: 'plus', target: () => this.incFontSize(), style: {'width.px': 18}},
      {
        icon: 'dice4',
        target: [{
          icon: 'dice4',
          title: this.i18n.gotoRandomSongInCollectionMenu,
          target: () => {
            if (this.activeCollection && this.activeCollection.id) {
              this.shortcutsService.gotoRandomSong(this.activeCollection.id);
            }
          }
        }, {
          icon: 'dice4',
          title: this.i18n.gotoRandomSongInCatalogMenu,
          target: () => this.shortcutsService.gotoRandomSong()
        },],
        style: {'width.px': 22}
      },
    ]);
  }


  private handleMountUpdate(): void {
    if (!this.collectionMount || !this.songMountBeforeUpdate) {
      return;
    }
    const params = this.route.snapshot.params;
    const link = getSongPageLink(this.collectionMount, this.songMountBeforeUpdate, params[PARAM_PRIMARY_COLLECTION_MOUNT]);
    this.router.navigate([link]).catch(err => console.error(err));
  }

  private handleSongRemoval(): void {
    // Try to go to the next or prev song in the current collection. Fall-back to collection/studio page.
    const collectionId$ = this.cds.getCollectionIdByMount(this.collectionMount);
    const collection$ = collectionId$.pipe(mergeMap(id => this.cds.getCollectionById(id)));
    getAllSongsInCollectionsSorted(collection$, this.cds)
        .pipe(
            take(1),
            takeUntil(this.destroyed$)
        ).subscribe(songs => {
      const {collectionMount, song, primaryCollection} = this;
      const {prevSong, nextSong} = findPrevAndNextSongs(song && song.id, songs, song && song.title);
      const targetSong = nextSong || prevSong;
      if (targetSong && collectionMount && primaryCollection) {
        const link = getSongPageLink(collectionMount, targetSong.mount, primaryCollection.mount);
        this.router.navigate([link]).catch(err => console.error(err));
      } else if (this.isUserCollection) {
        this.router.navigate([MOUNT_STUDIO]).catch(err => console.error(err));
      } else {
        this.router.navigate([MOUNT_COLLECTION_PREFIX + this.collectionMount!]).catch(err => console.error(err));
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.contextMenuActionService.footerActions$.next([]);
  }

  updateMeta() {
    if (!this.song || !this.activeCollection || !this.songDetails || !this.primaryCollection) {
      return;
    }
    this.canonicalPageUrl = getFullLink(getSongPageLink(this.primaryCollection.mount, this.song.mount));
    const titlePrefix = `${this.song.title}, ${getNameFirstFormArtistName(this.activeCollection)} | `;
    const titleSuffix = this.i18n.titleSuffix(titlePrefix);
    updatePageMetadata(this.title, this.meta, {
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
    if (!event.shiftKey) {
      return;
    }
    switch (event.code) {
      case 'ArrowDown':
        this.transpose(-1);
        break;
      case 'ArrowUp':
        this.transpose(1);
        break;
      case 'Digit0':
        this.transpose(0);
        break;
      case 'BracketLeft':
      case 'BracketRight':
        const songTextEl = this.getSongTextElement();
        if (event.code === 'BracketLeft') {
          scrollToView(songTextEl);
        } else {
          scrollToViewByEndPos(songTextEl);
        }
        break;
    }
  }

  private getSongTextElement(): HTMLElement|undefined {
    return (this.elementRef.nativeElement as HTMLElement).querySelector(SONG_TEXT_COMPONENT_NAME) as HTMLElement|undefined;
  }

  openEditor(): void {
    this.editorIsOpen = true;
    this.cd.detectChanges();
  }

  closeEditor(): void {
    this.editorIsOpen = false;
  }

  transpose(steps: number): void {
    if (this.songSettings) {
      const transpose = steps === 0 ? 0 : (this.songSettings!.transpose + steps) % TONES_COUNT;
      this.uds.setUserSongSettings({...this.songSettings!, transpose});
    }
  }

  incFontSize(): void {
    if (this.deviceSettings) {
      this.updateSongFontSize(Math.min(this.deviceSettings.songFontSize + 1, MAX_SONG_FONT_SIZE));
    }
  }

  decFontSize(): void {
    if (this.deviceSettings) {
      this.updateSongFontSize(Math.max(this.deviceSettings.songFontSize - 1, MIN_SONG_FONT_SIZE));
    }
  }

  private updateSongFontSize(songFontSize: number) {
    if (this.deviceSettings) {
      this.uds.setUserDeviceSettings({...this.deviceSettings, songFontSize});
    }
  }

  onMountChangeBeforeUpdate(mountBeforeUpdate: string): void {
    this.songMountBeforeUpdate = mountBeforeUpdate;
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
