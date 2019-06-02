import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, Input, OnChanges, OnDestroy, OnInit, PLATFORM_ID, SimpleChanges} from '@angular/core';
import {SongDetails} from '@common/artist-model';
import {Observable, Subject} from 'rxjs';
import {map, takeUntil} from 'rxjs/operators';
import {UserDataService} from '@app/services/user-data.service';
import {isPlatformBrowser} from '@angular/common';
import {renderChords} from '@app/utils/chords-renderer';

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
  songHtml: string = '';

  userSongStyle$!: Observable<{ [key: string]: string; }>;
  transpose = 0;

  b4Si?: boolean;

  readonly isBrowser: boolean;

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
}
