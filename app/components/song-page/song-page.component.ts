import {ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit} from '@angular/core';
import {CatalogDataService} from '@app/services/catalog-data.service';
import {ActivatedRoute, Router} from '@angular/router';
import {Collection, Song, SongDetails} from '@common/catalog-model';
import {BehaviorSubject, combineLatest, Subject} from 'rxjs';
import {flatMap, takeUntil, throttleTime} from 'rxjs/operators';
import {enableLoadingIndicator, switchToNotFoundMode} from '@app/utils/component-utils';
import {Meta, Title} from '@angular/platform-browser';
import {updatePageMetadata} from '@app/utils/seo-utils';
import {UserDataService} from '@app/services/user-data.service';
import {canEditCollection, getSongForumTopicLink, hasValidForumTopic} from '@common/util/misc-utils';
import {parseChordsLine} from '@app/utils/chords-parser';
import {RoutingNavigationHelper} from '@app/services/routing-navigation-helper.service';
import {MOUNT_COLLECTION_PREFIX, PARAM_COLLECTION_MOUNT, PARAM_SONG_MOUNT} from '@common/mounts';

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
  collection?: Collection;

  hasEditRight = false;
  editorIsOpen = false;

  readonly hasValidForumTopic = hasValidForumTopic;
  readonly getSongForumTopicLink = getSongForumTopicLink;

  loaded = false;
  notFound = false;

  constructor(private readonly cds: CatalogDataService,
              private readonly uds: UserDataService,
              readonly cd: ChangeDetectorRef,
              private readonly router: Router,
              private readonly route: ActivatedRoute,
              readonly title: Title,
              readonly meta: Meta,
              private readonly navHelper: RoutingNavigationHelper,
  ) {
  }

  ngOnInit() {
    enableLoadingIndicator(this);
    this.uds.syncSessionStateAsync();

    const params = this.route.snapshot.params;
    const collectionMount = params[PARAM_COLLECTION_MOUNT];
    const songMount = params[PARAM_SONG_MOUNT];

    const collectionId$ = this.cds.getCollectionIdByMount(collectionMount);
    const collection$ = collectionId$.pipe(flatMap(id => this.cds.getCollectionById(id)));
    const song$ = collectionId$.pipe(flatMap(collectionId => this.cds.getSongByMount(collectionId, songMount)));
    const songDetails$ = song$.pipe(flatMap(song => this.cds.getSongDetailsById(song && song.id)));

    combineLatest([collection$, song$, songDetails$, this.uds.getUser()])
        .pipe(
            takeUntil(this.destroyed$),
            throttleTime(100, undefined, {leading: true, trailing: true}),
        )
        .subscribe(([collection, song, songDetails, user]) => {
          this.loaded = true;
          if (this.song !== undefined && song === undefined) { // song was removed (deleted by user) -> return to the collection page.
            this.router.navigate([MOUNT_COLLECTION_PREFIX + collectionMount]).catch(err => console.error(err));
            return;
          }
          if (collection === undefined || song === undefined || songDetails === undefined) {
            switchToNotFoundMode(this);
            return;
          }
          this.song = song;
          this.songDetails = songDetails;
          this.collection = collection;
          this.updateMeta();
          this.hasEditRight = canEditCollection(user, collection.id);
          this.cd.detectChanges();
          this.navHelper.restoreScrollPosition();
        });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

  updateMeta() {
    if (!this.song || !this.collection || !this.songDetails) {
      return;
    }
    updatePageMetadata(this.title, this.meta, {
      title: `${this.song.title}, ${this.collection.name} — текст песни и аккорды`,
      description: getSongTextWithNoChords(this.songDetails.content, 5, true),
      keywords: [`подбор ${this.song.title}`, this.collection.name, 'табы', 'аккорды', 'аппликатура', 'гитара'],
    });
  }

  @HostListener('window:keydown', ['$event'])
  keyEvent(event: any): void {
    if (this.hasEditRight && !this.editorIsOpen && event.shiftKey && event.code === 'KeyE') {
      this.toggleEditor();
    }
  }

  toggleEditor(): void {
    this.editorIsOpen = !this.editorIsOpen && this.hasEditRight;
    this.cd.detectChanges();
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
