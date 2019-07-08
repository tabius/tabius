import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit} from '@angular/core';
import {UserDataService} from '@app/services/user-data.service';
import {getDefaultUserSongFontSize, newDefaultUserDeviceSettings, UserSongSettings} from '@common/user-model';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {TONES_COUNT} from '@app/utils/chords-renderer';


export const MAX_SONG_FONT_SIZE = 42;
export const MIN_SONG_FONT_SIZE = 8;

// TODO: extract common code with user settings page.

@Component({
  selector: 'gt-inline-song-settings',
  templateUrl: './inline-song-settings.component.html',
  styleUrls: ['./inline-song-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InlineSongSettingsComponent implements OnInit, OnDestroy {

  readonly destroyed$ = new Subject();

  @Input() songId!: number;

  deviceSettings = newDefaultUserDeviceSettings();
  readonly defaultFontSize = getDefaultUserSongFontSize();

  songSettings!: UserSongSettings;

  constructor(private readonly uds: UserDataService,
              private readonly cd: ChangeDetectorRef) {
  }

  ngOnInit() {
    this.uds.getUserDeviceSettings()
        .pipe(takeUntil(this.destroyed$))
        .subscribe(deviceSettings => {
          this.deviceSettings = deviceSettings;
          this.cd.detectChanges();
        });

    //FIXME: GH-3 resubscribe on changes.
    this.uds.getUserSongSettings(this.songId)
        .pipe(takeUntil(this.destroyed$))
        .subscribe(songSettings => {
          this.songSettings = songSettings;
          this.cd.detectChanges();
        });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

  incFontSize(): void {
    this.updateSongFontSize(Math.min(this.deviceSettings.songFontSize + 1, MAX_SONG_FONT_SIZE));
  }

  decFontSize(): void {
    this.updateSongFontSize(Math.max(this.deviceSettings.songFontSize - 1, MIN_SONG_FONT_SIZE));
  }

  resetFontSize(): void {
    this.updateSongFontSize(getDefaultUserSongFontSize());
  }

  private updateSongFontSize(songFontSize: number) {
    const deviceSettings = {...this.deviceSettings, songFontSize};
    this.uds.setUserDeviceSettings(deviceSettings);
    this.cd.detectChanges();
  }

  transposeDown(): void {
    const transpose = (this.songSettings.transpose - 1) % TONES_COUNT;
    this.uds.setUserSongSettings({...this.songSettings, transpose});
  }

  transposeUp(): void {
    const transpose = (this.songSettings.transpose + 1) % TONES_COUNT;
    this.uds.setUserSongSettings({...this.songSettings, transpose});
  }

  resetSongTranspose() {
    this.uds.setUserSongSettings({...this.songSettings, transpose: 0});
  }

  toggleChordsVisibility(hideChords: boolean): void {
    this.uds.setUserSongSettings({...this.songSettings, hideChords});
  }
}
