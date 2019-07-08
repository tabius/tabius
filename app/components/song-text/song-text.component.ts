import {ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, Inject, Input, OnChanges, OnDestroy, OnInit, Optional, PLATFORM_ID} from '@angular/core';
import {SongDetails} from '@common/artist-model';
import {Observable, Subject} from 'rxjs';
import {map, takeUntil} from 'rxjs/operators';
import {UserDataService} from '@app/services/user-data.service';
import {isPlatformBrowser} from '@angular/common';
import {renderChords} from '@app/utils/chords-renderer';
import {REQUEST} from '@nguniversal/express-engine/tokens';
import {isSmallScreenDevice} from '@common/util/misc-utils';
import {SSR_DESKTOP_WIDTH, SSR_MOBILE_WIDTH} from '@common/constants';
import {newDefaultUserSongSettings} from '@common/user-model';

/** Heuristic used to enable multicolumn mode. */
const MIN_SONG_LINES_FOR_2_COLUMN_MODE = 30;
const MIN_SONG_LINES_FOR_3_COLUMN_MODE = 60;

/** Отображает содежимое мести (текст) без заголовка и прочей мета-информации. */
@Component({
  selector: 'gt-song-text',
  templateUrl: './song-text.component.html',
  styleUrls: ['./song-text.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongTextComponent implements OnInit, OnChanges, OnDestroy {
  private readonly destroyed$ = new Subject();

  @Input() song!: SongDetails;
  @Input() multiColumnMode = true;

  /** Pre-rendered raw HTML for song text with all chords wrapped with a <c></c> tag*/
  songHtml: string = '';

  userSongStyle$!: Observable<{ [key: string]: string; }>;

  readonly isBrowser: boolean;

  private songSettings = newDefaultUserSongSettings(0);
  private b4Si?: boolean;
  private songFontSize?: number;
  private availableWidth = 0;

  private songStats?: SongStats;

  /** Used for server-side rendering only. */
  private readonly widthFromUserAgent;

  constructor(private readonly cd: ChangeDetectorRef,
              private readonly uds: UserDataService,
              @Inject(PLATFORM_ID) platformId: string,
              @Optional() @Inject(REQUEST) private request: any,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (!this.isBrowser) {
      const userAgent = request && request.headers ? request.headers ['user-agent'] : undefined;
      this.widthFromUserAgent = isSmallScreenDevice(userAgent) ? SSR_MOBILE_WIDTH : SSR_DESKTOP_WIDTH;
    } else {
      this.widthFromUserAgent = 0;
    }
  }

  ngOnInit(): void {
    this.userSongStyle$ = this.uds.getUserDeviceSettings()
        .pipe(
            takeUntil(this.destroyed$),
            map(settings => {
              const style = {};
              if (settings.songFontSize) {
                style['fontSize'] = `${settings.songFontSize}px`;
                this.songFontSize = settings.songFontSize;
                this.resetCachedSongStats();
              }
              return style;
            }));

    //todo: handle song text update
    this.uds.getUserSongSettings(this.song.id)
        .pipe(takeUntil(this.destroyed$))
        .subscribe(songSettings => {
          this.songSettings = songSettings;
          this.resetCachedSongStats(); // transposition may add extra characters that may lead to the line width update.
          this.updateSongView();
          this.cd.detectChanges();
        });

    this.uds.getB4SiFlag()
        .pipe(takeUntil(this.destroyed$))
        .subscribe(b4Si => {
          this.b4Si = b4Si;
          this.updateSongView();
          this.cd.detectChanges();
        });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

  ngOnChanges(): void {
    this.resetCachedSongStats();
    this.updateAvailableWidth();
    this.updateSongView();
  }

  private resetCachedSongStats(): void {
    delete this.songStats;
  }

  private updateSongView(): void {
    const {transpose, hideChords} = this.songSettings;
    this.songHtml = this.song && this.isBrowser ? renderChords(this.song.content, {tag: 'c', transpose, hideChords, useH: !this.b4Si}) : '';
  }

  @HostListener('window:resize', [])
  onWindowResize() {
    this.updateAvailableWidth();
  }

  private updateAvailableWidth(): void {
    if (this.multiColumnMode) {
      this.availableWidth = window.innerWidth || this.widthFromUserAgent;
    }
  }

  is2ColumnMode(): boolean {
    const {lineCount, maxLineWidth} = this.getSongStats();
    return lineCount > MIN_SONG_LINES_FOR_2_COLUMN_MODE &&
        !this.is3ColumnMode() && (this.availableWidth / (1 + maxLineWidth) >= 2);
  }

  is3ColumnMode(): boolean {
    const {lineCount, maxLineWidth} = this.getSongStats();
    return lineCount > MIN_SONG_LINES_FOR_3_COLUMN_MODE &&
        (this.availableWidth / (1 + maxLineWidth) >= 3);
  }

  private getSongStats(): SongStats {
    if (!this.songStats) {
      this.songStats = {lineCount: 1, maxLineWidth: 0}; // line count starts with 1 because even empty string ('') is counted as 1 line.
      let maxCharsPerLine = 0;
      const {content} = this.song;
      for (let i = 0; i < content.length;) {
        const lineSepIdx = content.indexOf('\n', i);
        if (lineSepIdx === -1) {
          break;
        }
        maxCharsPerLine = Math.max(maxCharsPerLine, lineSepIdx - 1 - i);
        i = lineSepIdx + 1;
        this.songStats.lineCount++;
      }
      // trivial heuristic for song width.
      this.songStats.maxLineWidth = (maxCharsPerLine + 1) * (this.songFontSize ? this.songFontSize : 16) * 2 / 3;
    }
    return this.songStats;
  }
}

interface SongStats {
  /** Number of lines (with chord lines) in the song .*/
  lineCount: number;
  /** Heuristic based maximum song line width in pixels. */
  maxLineWidth: number;
}
