import {ChangeDetectionStrategy, Component, Injector, OnDestroy, OnInit} from '@angular/core';
import {UserService} from '@app/services/user.service';
import {DEFAULT_FAVORITE_KEY, getDefaultUserSongFontSize, User, UserDeviceSettings} from '@common/user-model';
import {takeUntil} from 'rxjs/operators';
import {combineLatest} from 'rxjs';
import {SongDetails} from '@common/catalog-model';
import {RefreshMode} from '@app/store/observable-store';
import {ComponentWithLoadingIndicator} from '@app/utils/component-with-loading-indicator';
import {I18N} from '@app/app-i18n';
import {ChordTone, MINOR_KEY_TONES} from '@app/utils/chords-lib';
import {ClientAuthService} from '@app/services/client-auth.service';

export const MAX_SONG_FONT_SIZE = 42;
export const MIN_SONG_FONT_SIZE = 8;

@Component({
  templateUrl: './settings-page.component.html',
  styleUrls: ['./settings-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPageComponent extends ComponentWithLoadingIndicator implements OnInit, OnDestroy {

  readonly i18n = I18N.settingsPage;

  deviceSettings!: UserDeviceSettings;
  user?: User;
  h4Si!: boolean;

  readonly defaultFontSize = getDefaultUserSongFontSize();
  readonly settingsDemoSong = SETTINGS_DEMO_SONG;

  visualAllMinorToneKeys: ReadonlyArray<string> = MINOR_KEY_TONES;
  visualFavoriteSongKey: string = DEFAULT_FAVORITE_KEY;

  constructor(
      private readonly uds: UserService,
      private readonly authService: ClientAuthService,
      injector: Injector,
  ) {
    super(injector);
  }

  ngOnInit(): void {
    combineLatest([
      this.uds.getUser(),
      this.uds.getUserDeviceSettings(),
      //TODO: optimize these 2 parallel fetches! Fetch user settings only once.
      this.uds.getH4SiFlag(RefreshMode.Refresh),
      this.uds.getFavoriteKey(RefreshMode.Refresh),
    ])
        .pipe(takeUntil(this.destroyed$))
        .subscribe(([user, settings, h4si, favoriteSongKey]) => {
          this.loaded = true;
          this.user = user;
          this.deviceSettings = settings;
          this.h4Si = h4si;
          this.visualFavoriteSongKey = h4si && favoriteSongKey.startsWith('B') ? 'H' + favoriteSongKey.substring(1) : favoriteSongKey;
          this.visualAllMinorToneKeys = this.h4Si
                                        ? (MINOR_KEY_TONES.map(t => t.startsWith('B') ? `H${t.substring(1)}` : t))
                                        : MINOR_KEY_TONES;
          this.cd.detectChanges();
        });
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
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

  private updateSongFontSize(songFontSize: number): void {
    this.uds.setUserDeviceSettings({...this.deviceSettings, songFontSize});
  }

  useH4Si(h4SiFlag: boolean): void {
    this.uds.setH4SiFlag(h4SiFlag);
  }

  setFavoriteSongKey(visualFavoriteSongKey: string): void {
    const tone: ChordTone = visualFavoriteSongKey === 'H' ? 'B' : visualFavoriteSongKey as ChordTone;
    this.uds.setFavoriteKey(tone);
  }

  openRegistrationDialog(): void {
    this.authService.signup();
  }

  openSignInDialog(): void {
    this.authService.signin();
  }

}

const SETTINGS_DEMO_SONG: SongDetails = {
  id: 0,
  content: I18N.settingsPage.demoSongText,
  mediaLinks: [],
  version: 0
};
