import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {ArtistDataService} from '@app/services/artist-data.service';
import {ActivatedRoute, Router} from '@angular/router';
import {Artist, Song, SongDetails} from '@common/artist-model';
import {BehaviorSubject, combineLatest, Subject} from 'rxjs';
import {flatMap, takeUntil, throttleTime} from 'rxjs/operators';
import {enableLoadingIndicator, switchToNotFoundMode} from '@app/utils/component-utils';
import {Meta, Title} from '@angular/platform-browser';
import {updatePageMetadata} from '@app/utils/seo-utils';
import {UserDataService} from '@app/services/user-data.service';
import {canEditArtist, getSongForumTopicLink, hasValidForumTopic} from '@common/util/misc-utils';
import {parseChordsLine} from '@app/utils/chords-parser';
import {RoutingNavigationHelper} from '@app/services/routing-navigation-helper.service';
import {MOUNT_ARTIST_PREFIX} from '@common/mounts';

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
  artist?: Artist;

  hasEditRight = false;
  editorIsOpen = false;

  readonly hasValidForumTopic = hasValidForumTopic;
  readonly getSongForumTopicLink = getSongForumTopicLink;

  loaded = false;
  notFound = false;

  constructor(private readonly ads: ArtistDataService,
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
    const artistMount = params['artistMount'];
    const songMount = params['songMount'];

    const artistId$ = this.ads.getArtistIdByMount(artistMount);
    const artist$ = artistId$.pipe(flatMap(id => this.ads.getArtistById(id)));
    const song$ = artistId$.pipe(flatMap(artistId => this.ads.getSongByMount(artistId, songMount)));
    const songDetails$ = song$.pipe(flatMap(song => this.ads.getSongDetailsById(song ? song.id : undefined)));

    combineLatest([artist$, song$, songDetails$, this.uds.getUser()])
        .pipe(
            takeUntil(this.destroyed$),
            throttleTime(100, undefined, {leading: true, trailing: true}),
        )
        .subscribe(([artist, song, songDetails, user]) => {
          this.loaded = true;
          if (this.song !== undefined && song === undefined) { // song was removed (deleted by user) -> return to the artist page.
            this.router.navigate([MOUNT_ARTIST_PREFIX + artistMount]).catch(err => console.error(err));
            return;
          }
          if (artist === undefined || song === undefined || songDetails === undefined) {
            switchToNotFoundMode(this);
            return;
          }
          this.song = song;
          this.songDetails = songDetails;
          this.artist = artist;
          this.updateMeta();
          this.hasEditRight = canEditArtist(user, artist.id);
          this.cd.detectChanges();
          this.navHelper.restoreScrollPosition();
        });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

  updateMeta() {
    if (!this.song || !this.artist || !this.songDetails) {
      return;
    }
    updatePageMetadata(this.title, this.meta, {
      title: `${this.song.title}. ${this.artist.name}. Аккорды`,
      description: getSongTextWithNoChords(this.songDetails.content, 4, true),
      keywords: [`подбор ${this.song.title}`, this.artist.name, 'табы', 'аккорды', 'аппликатура', 'гитара'],
    });
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
    if (chords.length == 0) {
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
