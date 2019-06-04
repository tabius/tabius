import {ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, Inject, Input, OnChanges, OnDestroy, OnInit, PLATFORM_ID, SimpleChanges} from '@angular/core';
import {SongDetails} from '@common/artist-model';
import {Observable, Subject} from 'rxjs';
import {map, takeUntil} from 'rxjs/operators';
import {UserDataService} from '@app/services/user-data.service';
import {isPlatformBrowser} from '@angular/common';
import {renderChords} from '@app/utils/chords-renderer';

/** Heuristic used to enable multicolumn mode. */
const MIN_SONG_LEN_FOR_2_COLUMN_MODE = 800;
const MIN_SONG_LEN_FOR_3_COLUMN_MODE = 1200;

/** Отображает содежимое мести (текст) без заголовка и прочей мета-информации. */
@Component({
  selector: 'gt-song-view',
  templateUrl: './song-view.component.html',
  styleUrls: ['./song-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongViewComponent implements OnInit, OnChanges, OnDestroy {

  readonly destroyed$ = new Subject<unknown>();

  @Input() song!: SongDetails;
  @Input() multiColumnMode = true;
  songHtml: string = '';

  userSongStyle$!: Observable<{ [key: string]: string; }>;
  transpose = 0;

  b4Si?: boolean;

  readonly isBrowser: boolean;
  private availableWidth = 0;

  constructor(private readonly cd: ChangeDetectorRef,
              private readonly uds: UserDataService,
              @Inject(PLATFORM_ID) platformId: string) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.userSongStyle$ = this.uds.getUserDeviceSettings()
        .pipe(
            map(settings => {
              const style = {};
              if (settings.songFontSize) {
                style['fontSize'] = settings.songFontSize + 'px';
              }
              return style;
            }));

    //todo: handle song text update
    this.uds.getUserSongSettings(this.song.id)
        .pipe(takeUntil(this.destroyed$))
        .subscribe(songSettings => {
          this.transpose = songSettings.transpose;
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

    this.updateAvailableWidth();
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.updateSongView();
  }

  private updateSongView(): void {
    this.songHtml = this.song && this.isBrowser ? renderChords(this.song.content, {tag: 'c', transpose: this.transpose, useH: !this.b4Si}) : '';
  }

  @HostListener('window:resize', [])
  onWindowResize() {
    this.updateAvailableWidth();
  }

  private updateAvailableWidth(): void {
    if (this.multiColumnMode) {
      this.availableWidth = window.innerWidth;
    }
  }

  is2ColumnMode(): boolean {
    return this.song.content.length > MIN_SONG_LEN_FOR_2_COLUMN_MODE && this.availableWidth > 1300 && !this.is3ColumnMode();
  }

  is3ColumnMode(): boolean {
    return this.song.content.length > MIN_SONG_LEN_FOR_3_COLUMN_MODE && this.availableWidth > 1920;
  }
}
