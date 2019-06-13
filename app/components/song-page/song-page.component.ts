import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {ArtistDataService} from '@app/services/artist-data.service';
import {ActivatedRoute} from '@angular/router';
import {Artist, Song, SongDetails} from '@common/artist-model';
import {BehaviorSubject, combineLatest, of, Subject} from 'rxjs';
import {flatMap, takeUntil, throttleTime} from 'rxjs/operators';
import {throttleIndicator} from '@app/utils/component-utils';
import {Meta, Title} from '@angular/platform-browser';
import {updatePageMetadata} from '@app/utils/seo-utils';
import {UserDataService} from '@app/services/user-data.service';
import {isValidId} from '@common/util/misc_utils';
import {FORUM_LINK} from '@common/mounts';
import {parseChordsLine} from '@app/utils/chords-parser';

@Component({
  selector: 'gt-song-page',
  templateUrl: './song-page.component.html',
  styleUrls: ['./song-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongPageComponent implements OnInit, OnDestroy {
  readonly destroyed$ = new Subject<unknown>();
  readonly indicatorIsAllowed$ = new BehaviorSubject(false);

  loaded = false;
  song?: Song;
  songDetails?: SongDetails;
  artist?: Artist;
  youtubeLink?: string;
  onLine = true;
  settingsVisible = false;

  constructor(private readonly ads: ArtistDataService,
              private readonly uds: UserDataService,
              readonly cd: ChangeDetectorRef,
              private readonly route: ActivatedRoute,
              private readonly title: Title,
              private readonly meta: Meta,
  ) {
  }

  ngOnInit() {
    throttleIndicator(this);
    this.onLine = !navigator || navigator.onLine === undefined || navigator.onLine;

    const params = this.route.snapshot.params;
    const artistMount = params['artistMount'];
    const songMount = params['songMount'];

    const artist$ = this.ads.getArtistByMount(artistMount);
    const song$ = this.ads.getSongByMount(artistMount, songMount); //todo: create getSongByMount (artistId,songMount) ?
    const songDetails$ = song$.pipe(flatMap(song => song === undefined ? of(undefined) : this.ads.getSongDetailsById(song.id)));

    combineLatest([artist$, song$, songDetails$])
        .pipe(
            takeUntil(this.destroyed$),
            throttleTime(100, undefined, {leading: true, trailing: true}), //TODO: too much throttling. see (bad params) in the console!
        )
        .subscribe(([artist, song, songDetails]) => {
          if (artist === undefined || song === undefined || songDetails == undefined) {
            console.debug('Bad params for song page! A, S, SD: ', artist, song, songDetails);
            return; // reasons: not everything is loaded
          }
          this.song = song;
          this.songDetails = songDetails;
          this.youtubeLink = songDetails.mediaLinks ? songDetails.mediaLinks.find(link => link.startsWith('https://www.youtube.com/embed/')) : undefined;
          this.loaded = true;
          this.artist = artist;
          this.updateMeta();
          this.cd.markForCheck();
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
      description: getSongTextWithNoChords(this.songDetails.content, 4),
      keywords: [`подбор ${this.song.title}`, this.artist.name, 'табы', 'аккорды', 'аппликатура', 'гитара'],
    });
  }

  toggleSettings() {
    this.settingsVisible = !this.settingsVisible;
    this.cd.markForCheck();
  }

  hasValidForumTopic(): boolean {
    return this.song !== undefined && isValidId(this.song.tid);
  }

  getSongForumTopicLink(): string {
    if (!this.hasValidForumTopic()) {
      return '#';
    }
    return FORUM_LINK + '/topic/' + this.song!.tid;
  }
}

function isServiceLineChar(c: string): boolean {
  return c === '{' || c === '}' || c === '(' || c === ')' || c === '[' || c === ']';
}

/** Returns first 'lineCount' lines of the song. */
function getSongTextWithNoChords(text: string, linesCount: number): string {
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
        result += (linesFound > 1 ? ' ' : '') + text.substring(position, newPosition);
      }
    }
    position = newPosition + 1;
  }
  return result;
}
