import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {UserDataService} from '@app/services/user-data.service';
import {getDefaultUserSongFontSize, UserDeviceSettings} from '@common/user-model';
import {takeUntil} from 'rxjs/operators';
import {Subject} from 'rxjs';
import {MAX_SONG_FONT_SIZE, MIN_SONG_FONT_SIZE} from '@app/components/inline-song-settings/inline-song-settings.component';
import {SongDetails} from '@common/artist-model';

@Component({
  selector: 'gt-user-settings-page',
  templateUrl: './user-settings-page.component.html',
  styleUrls: ['./user-settings-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserSettingsPageComponent implements OnInit, OnDestroy {

  deviceSettings!: UserDeviceSettings;
  b4Si!: boolean;

  readonly destroyed$ = new Subject<unknown>();
  readonly defaultFontSize = getDefaultUserSongFontSize();
  readonly settingsDemoSong = SETTINGS_DEMO_SONG;

  constructor(private readonly cd: ChangeDetectorRef,
              private readonly uds: UserDataService) {
  }

  ngOnInit() {
    this.uds.getUserDeviceSettings()
        .pipe(takeUntil(this.destroyed$))
        .subscribe(settings => {
          this.deviceSettings = settings;
          this.cd.detectChanges();
        });

    this.uds.getB4SiFlag()
        .pipe(takeUntil(this.destroyed$))
        .subscribe(b4Si => {
          this.b4Si = b4Si;
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

  useB4Si(b4SiFlag: boolean): void {
    this.uds.setB4SiFlag(b4SiFlag);
  }
}

const SETTINGS_DEMO_SONG: SongDetails = {
  id: 0,
  content:
      'Bm                           D\n' +
      'Песен, еще не написанных, сколько?\n' +
      '           A   Em\n' +
      'Скажи, кукушка,\n' +
      '   Bm\n' +
      'Пропой.\n',
  mediaLinks: [],
  version: 0
};
