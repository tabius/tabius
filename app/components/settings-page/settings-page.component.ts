import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {UserDataService} from '@app/services/user-data.service';
import {getDefaultUserSongFontSize, User, UserDeviceSettings} from '@common/user-model';
import {takeUntil} from 'rxjs/operators';
import {BehaviorSubject, combineLatest, Subject} from 'rxjs';
import {MAX_SONG_FONT_SIZE, MIN_SONG_FONT_SIZE} from '@app/components/inline-song-settings/inline-song-settings.component';
import {SongDetails} from '@common/artist-model';
import {NODE_BB_LOGIN_URL, NODE_BB_REGISTRATION_URL} from '@common/constants';
import {RefreshMode} from '@app/store/observable-store';
import {enableLoadingIndicator} from '@app/utils/component-utils';

@Component({
  selector: 'gt-settings-page',
  templateUrl: './settings-page.component.html',
  styleUrls: ['./settings-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPageComponent implements OnInit, OnDestroy {

  deviceSettings!: UserDeviceSettings;
  user?: User;
  b4Si!: boolean;

  readonly loginLink = NODE_BB_LOGIN_URL;
  readonly registrationLink = NODE_BB_REGISTRATION_URL;

  readonly destroyed$ = new Subject();
  readonly defaultFontSize = getDefaultUserSongFontSize();
  readonly settingsDemoSong = SETTINGS_DEMO_SONG;

  readonly indicatorIsAllowed$ = new BehaviorSubject(false);
  loaded = false;

  constructor(readonly cd: ChangeDetectorRef,
              private readonly uds: UserDataService,
  ) {
  }

  ngOnInit() {
    enableLoadingIndicator(this);
    this.uds.syncSessionStateAsync();

    combineLatest([
      this.uds.getUser(),
      this.uds.getUserDeviceSettings(),
      this.uds.getB4SiFlag(RefreshMode.Refresh),
    ])
        .pipe(takeUntil(this.destroyed$))
        .subscribe(([user, settings, b4si]) => {
          this.loaded = true;
          this.user = user;
          this.deviceSettings = settings;
          this.b4Si = b4si;
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
