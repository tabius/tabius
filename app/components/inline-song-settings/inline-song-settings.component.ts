import {ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges} from '@angular/core';
import {UserService} from '@app/services/user.service';
import {getDefaultUserSongFontSize, newDefaultUserDeviceSettings, UserSongSettings} from '@common/user-model';
import {Subject, Subscription} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {TONES_COUNT} from '@app/utils/chords-renderer';
import {HelpService} from '@app/services/help.service';


export const MAX_SONG_FONT_SIZE = 42;
export const MIN_SONG_FONT_SIZE = 8;

// TODO: extract common code with user settings page.

@Component({
  selector: 'gt-inline-song-settings',
  templateUrl: './inline-song-settings.component.html',
  styleUrls: ['./inline-song-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InlineSongSettingsComponent implements OnInit, OnChanges, OnDestroy {

  private readonly destroyed$ = new Subject();

  @Input() songId!: number;

  @Output() closeCallback = new EventEmitter<void>();

  readonly defaultFontSize = getDefaultUserSongFontSize();

  deviceSettings = newDefaultUserDeviceSettings();

  songSettings?: UserSongSettings;

  isTransposed = false;

  isDefaultFontSize = true;

  private songSettingsSubscription?: Subscription;

  constructor(private readonly uds: UserService,
              private readonly cd: ChangeDetectorRef,
              private readonly helpService: HelpService,
  ) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.resetComponentState();

    this.songSettingsSubscription = this.uds.getUserSongSettings(this.songId)
        .pipe(takeUntil(this.destroyed$))
        .subscribe(songSettings => {
          this.songSettings = songSettings;
          this.isTransposed = songSettings.transpose !== 0;
          this.cd.detectChanges();
        });

  }

  private resetComponentState(): void {
    this.songSettings = undefined;
    this.isTransposed = false;
    if (this.songSettingsSubscription) {
      this.songSettingsSubscription.unsubscribe();
    }
  }

  ngOnInit() {
    this.uds.getUserDeviceSettings()
        .pipe(takeUntil(this.destroyed$))
        .subscribe(deviceSettings => {
          this.deviceSettings = deviceSettings;
          this.isDefaultFontSize = this.defaultFontSize === deviceSettings.songFontSize;
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
    const transpose = (this.songSettings!.transpose - 1) % TONES_COUNT;
    this.uds.setUserSongSettings({...this.songSettings!, transpose});
  }

  transposeUp(): void {
    const transpose = (this.songSettings!.transpose + 1) % TONES_COUNT;
    this.uds.setUserSongSettings({...this.songSettings!, transpose});
  }

  resetSongTranspose() {
    this.uds.setUserSongSettings({...this.songSettings!, transpose: 0});
  }

  onHideChordsCheckboxChanged(event: Event): void {
    if (this.songSettings) {
      this.uds.setUserSongSettings({...this.songSettings, hideChords: (event.target! as HTMLInputElement).checked});
    }
  }

  close(): void {
    this.closeCallback.emit();
  }

  showShortcuts(): void {
    this.helpService.showKeyboardShortcuts();
  }
}
