import {ChangeDetectionStrategy, Component, Injector, OnDestroy, OnInit} from '@angular/core';
import {UserService} from '@app/services/user.service';
import {getDefaultUserSongFontSize, User, UserDeviceSettings} from '@common/user-model';
import {takeUntil} from 'rxjs/operators';
import {combineLatest} from 'rxjs';
import {SongDetails} from '@common/catalog-model';
import {NODE_BB_LOGIN_URL, NODE_BB_REGISTRATION_URL} from '@app/app-constants';
import {RefreshMode} from '@app/store/observable-store';
import {ComponentWithLoadingIndicator} from '@app/utils/component-with-loading-indicator';

export const MAX_SONG_FONT_SIZE = 42;
export const MIN_SONG_FONT_SIZE = 8;

@Component({
  selector: 'gt-settings-page',
  templateUrl: './settings-page.component.html',
  styleUrls: ['./settings-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPageComponent extends ComponentWithLoadingIndicator implements OnInit, OnDestroy {

  deviceSettings!: UserDeviceSettings;
  user?: User;
  h4Si!: boolean;

  readonly loginLink = NODE_BB_LOGIN_URL;
  readonly registrationLink = NODE_BB_REGISTRATION_URL;

  readonly defaultFontSize = getDefaultUserSongFontSize();
  readonly settingsDemoSong = SETTINGS_DEMO_SONG;

  constructor(private readonly uds: UserService,
              injector: Injector,
  ) {
    super(injector);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.uds.syncSessionStateAsync();
    }

    combineLatest([
      this.uds.getUser(),
      this.uds.getUserDeviceSettings(),
      this.uds.getH4SiFlag(RefreshMode.Refresh),
    ])
        .pipe(takeUntil(this.destroyed$))
        .subscribe(([user, settings, h4si]) => {
          this.loaded = true;
          this.user = user;
          this.deviceSettings = settings;
          this.h4Si = h4si;
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
    this.uds.setUserDeviceSettings({...this.deviceSettings, songFontSize});
  }

  useH4Si(h4SiFlag: boolean): void {
    this.uds.setH4SiFlag(h4SiFlag);
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
