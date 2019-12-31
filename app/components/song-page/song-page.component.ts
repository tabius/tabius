import {ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit} from '@angular/core';
import {CatalogService} from '@app/services/catalog.service';
import {ActivatedRoute, Router} from '@angular/router';
import {Collection, Song, SongDetails} from '@common/catalog-model';
import {BehaviorSubject, combineLatest, of, Subject} from 'rxjs';
import {flatMap, takeUntil, throttleTime} from 'rxjs/operators';
import {enableLoadingIndicator, switchToNotFoundMode} from '@app/utils/component-utils';
import {Meta, Title} from '@angular/platform-browser';
import {updatePageMetadata} from '@app/utils/seo-utils';
import {UserService} from '@app/services/user.service';
import {canManageCollectionContent, getNameFirstFormArtistName, hasValidForumTopic, isInputEvent} from '@common/util/misc-utils';
import {parseChordsLine} from '@app/utils/chords-parser';
import {RoutingNavigationHelper} from '@app/services/routing-navigation-helper.service';
import {MOUNT_COLLECTION_PREFIX, MOUNT_STUDIO, PARAM_COLLECTION_MOUNT, PARAM_PRIMARY_COLLECTION_MOUNT, PARAM_SONG_MOUNT} from '@common/mounts';
import {getSongForumTopicLink} from '@app/utils/url-utils';
import {TONES_COUNT} from '@app/utils/chords-renderer';
import {UserSongSettings} from '@common/user-model';
import {SongEditResult} from '@app/components/song-editor/song-editor.component';
import {HelpService} from '@app/services/help.service';
import {BrowserStateService} from '@app/services/browser-state.service';

@Component({
  selector: 'gt-song-page',
  templateUrl: './song-page.component.html',
  styleUrls: ['./song-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongPageComponent implements OnInit, OnDestroy {
  readonly destroyed$ = new Subject();
  readonly indicatorIsAllowed$ = new BehaviorSubject(false);

  song?: Song;
  songDetails?: SongDetails;
  activeCollection?: Collection;
  primaryCollection?: Collection;
  songSettings?: UserSongSettings;

  hasEditRight = false;
  editorIsOpen = false;
  private isUserCollection = false;

  readonly hasValidForumTopic = hasValidForumTopic;
  readonly getSongForumTopicLink = getSongForumTopicLink;

  loaded = false;
  notFound = false;

  collectionMount?: string;

  readonly isBrowser: boolean;

  constructor(private readonly cds: CatalogService,
              private readonly uds: UserService,
              readonly cd: ChangeDetectorRef,
              private readonly router: Router,
              private readonly route: ActivatedRoute,
              readonly title: Title,
              readonly meta: Meta,
              private readonly navHelper: RoutingNavigationHelper,
              private readonly helpService: HelpService,
              private readonly bss: BrowserStateService,
  ) {
    this.isBrowser = bss.isBrowser;
  }

  ngOnInit() {
    enableLoadingIndicator(this);
    this.helpService.setActiveHelpPage('song');
    this.uds.syncSessionStateAsync();

    const params = this.route.snapshot.params;
    this.collectionMount = params[PARAM_COLLECTION_MOUNT];
    let primaryCollectionMount = params[PARAM_PRIMARY_COLLECTION_MOUNT];
    const songMount = params[PARAM_SONG_MOUNT];

    if (this.collectionMount === primaryCollectionMount) {
      this.loaded = true;
      switchToNotFoundMode(this); // TODO: use permanent redirect to the primary song page?
      return;
    }

    if (primaryCollectionMount === undefined) {
      primaryCollectionMount = this.collectionMount;
    }
    const collectionId$ = this.cds.getCollectionIdByMount(this.collectionMount);
    const primaryCollectionId$ = this.cds.getCollectionIdByMount(primaryCollectionMount);
    const collection$ = collectionId$.pipe(flatMap(id => this.cds.getCollectionById(id)));
    const primaryCollection$ = primaryCollectionId$.pipe(flatMap(id => this.cds.getCollectionById(id)));
    const song$ = collectionId$.pipe(flatMap(collectionId => this.cds.getSongByMount(collectionId, songMount)));
    const songDetails$ = song$.pipe(flatMap(song => this.cds.getSongDetailsById(song && song.id)));

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
          if (hadSongBefore && !haveSongNow) { // song was removed (deleted by user) -> return to the user/collection page.
            this.handleSongRemoval();
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
          this.updateMeta();
          this.hasEditRight = canManageCollectionContent(user, primaryCollection);
          this.cd.detectChanges();
          this.navHelper.restoreScrollPosition();
        });

    song$.pipe(flatMap(song => song ? this.uds.getUserSongSettings(song.id) : of(undefined)),
        takeUntil(this.destroyed$)
    ).subscribe(songSettings => {
      this.songSettings = songSettings;
    });
  }

  private handleSongRemoval(): void {
    if (this.isUserCollection) {
      this.router.navigate([MOUNT_STUDIO]).catch(err => console.error(err));
    } else {
      this.router.navigate([MOUNT_COLLECTION_PREFIX + this.collectionMount!]).catch(err => console.error(err));
    }
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

  updateMeta() {
    if (!this.song || !this.activeCollection || !this.songDetails) {
      return;
    }
    const titlePrefix = `${this.song.title}, ${getNameFirstFormArtistName(this.activeCollection)} | `;
    const titleSuffix = titlePrefix.length > 50 ? 'аккорды' : titlePrefix.length > 35 ? 'текст и аккорды' : 'текст песни и аккорды';
    updatePageMetadata(this.title, this.meta, {
      title: titlePrefix + titleSuffix,
      description: getSongTextWithNoChords(this.songDetails.content, 5, true),
      keywords: [`подбор ${this.song.title}`, this.activeCollection.name, 'табы', 'аккорды', 'текст песни', 'стихи', 'аппликатура', 'гитара'],
    });
  }

  @HostListener('window:keydown', ['$event'])
  keyEvent(event: KeyboardEvent): void {
    if (this.hasEditRight && !this.editorIsOpen && event.shiftKey && !isInputEvent(event) && event.code === 'KeyE') {
      this.toggleEditor();
    }
  }

  toggleEditor(): void {
    this.editorIsOpen = !this.editorIsOpen && this.hasEditRight;
    this.cd.detectChanges();
  }

  closeEditor(closeResult: SongEditResult): void {
    if (closeResult.type === 'deleted') {
      this.handleSongRemoval();
      return;
    }
    this.editorIsOpen = false;
    this.cd.detectChanges();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.shiftKey && ((event.target) as HTMLElement).tagName.toLowerCase() !== 'textarea') {
      if (event.code === 'ArrowDown') {
        this.transpose(-1);
      } else if (event.code === 'ArrowUp') {
        this.transpose(1);
      } else if (event.code === 'Digit0') {
        this.transpose(0);
      }
    }
  }

  transpose(steps: number): void {
    if (this.songSettings) {
      const transpose = steps === 0 ? 0 : (this.songSettings!.transpose + steps) % TONES_COUNT;
      this.uds.setUserSongSettings({...this.songSettings!, transpose});
    }
  }

}

function isServiceLineChar(c: string): boolean {
  return c === '{' || c === '}' || c === '(' || c === ')' || c === '[' || c === ']';
}

//TODO: move to utils
/** Returns first 'lineCount' lines of the song. */
export function getSongTextWithNoChords(text: string, linesCount: number, mergeLines: boolean): string {
  let result = '';
  let linesFound = 0;
  let position = 0;
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
