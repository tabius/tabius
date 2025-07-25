import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  Input,
  OnChanges,
  SimpleChanges,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { SongDetails } from '@common/catalog-model';
import { switchMap } from 'rxjs';
import { UserService } from '@app/services/user.service';
import { renderChords } from '@common/util/chords-renderer';
import { REQUEST } from '@app/express.tokens';
import { getUserAgentFromRequest, isSmallScreenDevice } from '@common/util/misc-utils';
import { MIN_DESKTOP_WIDTH, SSR_DESKTOP_WIDTH, SSR_MOBILE_WIDTH } from '@common/common-constants';
import { newDefaultUserSongSettings, UserDeviceSettings } from '@common/user-model';
import { ChordLayout } from '@common/util/chords-layout-lib';
import { parseChord } from '@common/util/chords-parser';
import { ChordClickInfo } from '@app/directives/show-chord-popover-on-click.directive';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Request } from 'express';
import { AbstractAppComponent } from '@app/utils/abstract-app-component';
import { assertTruthy } from 'assertic';
import { newDefaultUserDeviceSettings } from '@app/utils/misc-utils';
import { getSmallScreenYoutubeVideoWidthInBrowser } from '@app/components/song-video/song-video.component';

/** Heuristic used to enable multi-column mode. */
const IDEAL_SONG_LINES_PER_COLUMN = 18; // (4 chords + 4 text lines) * 2 + 1 line after the first and 1 line after the second verse.

/** Note: must be lower-case! */
const CHORDS_TAG = 'c';

export const SONG_PRINT_FONT_SIZE = 14;

// Keep in sync with SongTextComponent selector
export const SONG_TEXT_COMPONENT_NAME = 'gt-song-text';

/** Shows song content (text with chords) with no title and any other meta-info. */
@Component({
  // Keep in sync with SONG_TEXT_COMPONENT_NAME
  // Note: not using a variable because typescript 4.0 + IDEA static analyzers fails to detect the element and report error.
  selector: 'gt-song-text',
  templateUrl: './song-text.component.html',
  styleUrls: ['./song-text.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class SongTextComponent extends AbstractAppComponent implements OnChanges {
  private readonly uds = inject(UserService);

  @Input({ required: true }) song!: SongDetails;
  @Input() multiColumnMode = true;
  @Input() usePrintFontSize = false;

  /** Pre-rendered raw HTML for song text with all chords wrapped with a <c></c> tag*/
  private songHtml: string = '';

  userSongStyle: { [key: string]: string } = {};

  private deviceSettings: UserDeviceSettings = newDefaultUserDeviceSettings();
  private songSettings = newDefaultUserSongSettings(0);
  h4Si?: boolean;
  private songFontSize?: number;
  private availableWidth = 0;

  private songStats?: SongStats;

  /** Used for server-side rendering only. */
  private readonly widthFromUserAgent: number;

  popoverChordLayout?: ChordLayout;

  @ViewChild('chordPopover', { static: true }) chordPopoverTemplate!: TemplateRef<void>;

  constructor() {
    const request: Request | null = inject<Request>(REQUEST, { optional: true });

    super();
    if (!this.isBrowser) {
      assertTruthy(request, 'Request must present in server mode');
      const userAgent = getUserAgentFromRequest(request);
      this.widthFromUserAgent = isSmallScreenDevice(userAgent) ? SSR_MOBILE_WIDTH : SSR_DESKTOP_WIDTH;
    } else {
      this.widthFromUserAgent = 0;
    }

    this.uds.userDeviceSettings$.pipe(takeUntilDestroyed()).subscribe(deviceSettings => {
      this.deviceSettings = deviceSettings;
      this.updateSongStyle();
      this.cdr.markForCheck();
    });

    //TODO: replace taps with subscriptions!
    //todo: handle song text update too
    this.changes$
      .pipe(
        switchMap(() => this.uds.getUserSongSettings(this.song.id)),
        takeUntilDestroyed(),
      )
      .subscribe(songSettings => {
        this.songSettings = songSettings;
        this.resetCachedSongStats(); // transposition may add extra characters that may lead to the line width update.
        this.resetSongView();
        this.cdr.markForCheck();
      });

    this.uds
      .getH4SiFlag()
      .pipe(takeUntilDestroyed())
      .subscribe(h4Si => {
        this.h4Si = h4Si;
        this.resetSongView();
        this.cdr.markForCheck();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['usePrintFontSize']) {
      this.updateSongStyle();
    }
    this.resetCachedSongStats();
    this.updateAvailableWidth();
    this.resetSongView();
    super.ngOnChanges(changes);
  }

  getSongHtml(): string {
    if (this.songHtml === '') {
      const { transpose } = this.songSettings;
      let songHtml =
        this.song && this.isBrowser
          ? renderChords(this.song.content, { tag: CHORDS_TAG, transpose, hideChords: false, useH: this.h4Si })
          : '';
      if (this.multiColumnMode) {
        songHtml = preserveBlocksOnColumnBreak(songHtml);
      }
      this.songHtml = songHtml;
    }
    return this.songHtml;
  }

  private resetCachedSongStats(): void {
    delete this.songStats;
  }

  private resetSongView(): void {
    this.songHtml = '';
  }

  @HostListener('window:resize', [])
  onWindowResize() {
    this.updateAvailableWidth();
  }

  private updateAvailableWidth(): void {
    if (this.multiColumnMode) {
      const clientWidth = (typeof window !== 'undefined' && window.document.body.clientWidth) || this.widthFromUserAgent;
      this.availableWidth = clientWidth;
      this.availableWidth -= 40; // Main block padding left & right.
      if (clientWidth > MIN_DESKTOP_WIDTH) {
        this.availableWidth -= 150; // Navigation borders in desktop mode.
      } else {
        this.availableWidth = Math.max(this.availableWidth, getSmallScreenYoutubeVideoWidthInBrowser());
      }
    }
  }

  // Important: sync with `.multi-column-mode-style.column-gap`.
  private readonly CSS_COLUMN_GAP = 50;

  is2ColumnMode(): boolean {
    const { lineCount, maxLineWidth } = this.getSongStats();
    return (
      lineCount > IDEAL_SONG_LINES_PER_COLUMN &&
      !this.is3ColumnMode() &&
      !this.is4ColumnMode() &&
      this.availableWidth >= 2 * maxLineWidth + this.CSS_COLUMN_GAP
    );
  }

  is3ColumnMode(): boolean {
    const { lineCount, maxLineWidth } = this.getSongStats();
    return (
      lineCount > 2 * IDEAL_SONG_LINES_PER_COLUMN &&
      !this.is4ColumnMode() &&
      this.availableWidth >= 3 * maxLineWidth + 2 * this.CSS_COLUMN_GAP
    );
  }

  is4ColumnMode(): boolean {
    const { lineCount, maxLineWidth } = this.getSongStats();
    return lineCount > 3 * IDEAL_SONG_LINES_PER_COLUMN && this.availableWidth >= 4 * maxLineWidth + 3 * this.CSS_COLUMN_GAP;
  }

  private getSongStats(): SongStats {
    if (!this.songStats) {
      this.songStats = { lineCount: 1, maxLineWidth: 0 }; // line count starts with 1 because even empty string ('') is counted as one line.
      const songFontSize = this.usePrintFontSize ? SONG_PRINT_FONT_SIZE : this.songFontSize || 16;
      const { content } = this.song;
      // Simple heuristic for the song text width.
      for (let i = 0; i < content.length; ) {
        const lineSepIdx = content.indexOf('\n', i);
        if (lineSepIdx === -1) {
          break;
        }
        const line = content.substring(i, lineSepIdx);
        const lineWidth = getTextWidth(line, songFontSize);
        this.songStats.maxLineWidth = Math.max(this.songStats.maxLineWidth, lineWidth);
        i = lineSepIdx + 1;
        this.songStats.lineCount++;
      }
    }
    return this.songStats;
  }

  private updateSongStyle(): void {
    if (this.usePrintFontSize) {
      this.songFontSize = SONG_PRINT_FONT_SIZE;
    } else {
      this.songFontSize = this.deviceSettings.songFontSize;
    }
    this.userSongStyle['fontSize'] = `${this.songFontSize}px`;
    this.resetCachedSongStats();
  }

  getChordInfo(event: MouseEvent): ChordClickInfo {
    const element = event.target as HTMLElement | undefined;
    if (!element) {
      return undefined;
    }
    if (element.tagName.toLowerCase() !== CHORDS_TAG) {
      return undefined;
    }
    const chordLocation = parseChord(element.innerText);
    return chordLocation ? { element, chord: chordLocation.chord } : undefined;
  }
}

interface SongStats {
  /** Number of lines (with chord lines) in the song .*/
  lineCount: number;
  /** Heuristic based maximum song line width in pixels. */
  maxLineWidth: number;
}

const NON_BREAKING_TAG_START = '<div style="break-inside: avoid-column;">';
const NON_BREAKING_TAG_END = '</div>';

/**
 * Wraps blocks of text separated with multiple line breaks
 * with 'break-inside: avoid-column' css style.
 */
function preserveBlocksOnColumnBreak(songHtml: string): string {
  const blocks = songHtml.replace(/[^\S\n]+$/gm, '').split('\n\n');
  let blockIsOpen = false;
  let songHtmlWithBlocks = '';
  for (const block of blocks) {
    if (blockIsOpen) {
      songHtmlWithBlocks += '</div>';
      blockIsOpen = false;
    }
    const linesCountInBlock = (block.match(/\n/g) || '').length;
    const makeBlockNonBreaking = linesCountInBlock <= 12; // Keep blocks up to 6 lines (6 text + 6 chords).
    if (makeBlockNonBreaking) {
      songHtmlWithBlocks += NON_BREAKING_TAG_START;
      songHtmlWithBlocks += preserveBlockOnColumnBreak(block);
      blockIsOpen = true;
    } else {
      songHtmlWithBlocks += preserveBlockOnColumnBreak(block);
    }
    if (songHtmlWithBlocks.endsWith(NON_BREAKING_TAG_END)) {
      songHtmlWithBlocks += '\n'; // already ends with a line end.
    } else {
      songHtmlWithBlocks += '\n\n';
    }
  }
  if (blockIsOpen) {
    songHtmlWithBlocks += NON_BREAKING_TAG_END;
  }
  return songHtmlWithBlocks;
}

/** Wrap pairs of lines (chords + non-chords) into non-breaking block. */
function preserveBlockOnColumnBreak(blockHtml: string): string {
  const hasChords = (line: string) => line.includes(`<${CHORDS_TAG}>`);
  const lines = blockHtml.split('\n');
  let resultHtml = '';
  for (let i = 0; i < lines.length; i++) {
    if (i + 1 < lines.length) {
      const line1 = lines[i];
      const line2 = lines[i + 1];
      if (hasChords(line1) && !hasChords(line2)) {
        resultHtml += NON_BREAKING_TAG_START + line1 + '\n' + line2 + NON_BREAKING_TAG_END;
        i++;
        continue;
      }
    }
    resultHtml += lines[i] + (i === lines.length - 1 ? '' : '\n');
  }
  return resultHtml;
}

let canvasForTextWidth: HTMLCanvasElement | undefined;

function getTextWidth(text: string, fontSizePx: number): number {
  if (typeof window === 'undefined') {
    const charWidth = (fontSizePx * 2) / 3;
    return text.length * charWidth;
  }

  if (!canvasForTextWidth) {
    canvasForTextWidth = document.createElement('canvas');
  }
  assertTruthy(canvasForTextWidth);
  const context = canvasForTextWidth.getContext('2d');
  assertTruthy(context);
  context.font = `${fontSizePx}px 'Ubuntu Mono', monospace`;
  const metrics = context.measureText(text);
  return metrics.width;
}
