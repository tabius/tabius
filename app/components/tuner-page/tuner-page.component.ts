import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { UserService } from '@app/services/user.service';
import { TunerToneType } from '@common/user-model';
import { I18N } from '@app/app-i18n';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractAppComponent } from '@app/utils/abstract-app-component';
import { newDefaultUserDeviceSettings } from '@app/utils/misc-utils';

const GUITAR_STRINGS = ['e', 'B', 'G', 'D', 'A', 'E'];

@Component({
  templateUrl: './tuner-page.component.html',
  styleUrls: ['./tuner-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TunerPageComponent extends AbstractAppComponent implements OnDestroy {
  private destroyed = false;

  readonly i18n = I18N.tunerPage;
  readonly i18nCommon = I18N.common;

  @ViewChild('s1', { static: true }) private s1!: ElementRef;
  @ViewChild('s2', { static: true }) private s2!: ElementRef;
  @ViewChild('s3', { static: true }) private s3!: ElementRef;
  @ViewChild('s4', { static: true }) private s4!: ElementRef;
  @ViewChild('s5', { static: true }) private s5!: ElementRef;
  @ViewChild('s6', { static: true }) private s6!: ElementRef;

  private currentString = 'e';
  private deviceSettings = newDefaultUserDeviceSettings();
  private playingAudio?: HTMLAudioElement;
  private forceStop = false;
  private focusedString = '';

  constructor(private readonly uds: UserService) {
    super();
    this.uds
      .userDeviceSettings$()
      .pipe(takeUntilDestroyed())
      .subscribe(deviceSettings => {
        this.deviceSettings = deviceSettings;
        this.cdr.markForCheck();
      });
    this.updatePageMetadata(this.i18n.meta);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stop();
  }

  @HostListener('window:keydown', ['$event'])
  keyEvent(event: KeyboardEvent): void {
    switch (event.code) {
      case 'Space':
        if ((this.playingAudio && this.focusedString === this.currentString) || this.focusedString === '') {
          this.stop();
          this.forceStop = true;
        } else {
          if (this.focusedString !== '') {
            this.currentString = this.focusedString;
          }
          this._play();
        }
        break;
      case 'Digit0':
        this.setRepeatMode(!this.deviceSettings.tunerRepeatMode);
        break;
      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
      case 'Digit5':
      case 'Digit6':
        this.handlePlayByKey(parseInt(event.code.replace('Digit', '')) - 1);
        break;
      case 'ArrowRight':
      case 'KeyX':
        const nextStringIdx = (getGuitarStringIndex(this.currentString) + 1) % GUITAR_STRINGS.length;
        this.handlePlayByKey(nextStringIdx);
        break;
      case 'ArrowLeft':
      case 'KeyZ':
        const prevStringIdx = (getGuitarStringIndex(this.currentString) + GUITAR_STRINGS.length - 1) % GUITAR_STRINGS.length;
        this.handlePlayByKey(prevStringIdx);
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'KeyQ':
      case 'KeyA':
        this.setToneType(this.deviceSettings.tunerToneType === 'c' ? 'e' : 'c');
        this._play();
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  private handlePlayByKey(stringIdx: number): void {
    const guitarString = GUITAR_STRINGS[stringIdx];
    if (this.focusedString !== guitarString) {
      const el = this.getStringElement(guitarString);
      el && el.nativeElement.focus();
    }
    this.play(guitarString);
  }

  play(guitarString: string): void {
    this.currentString = guitarString;
    this._play();
  }

  trackFocus(focusedString: string): void {
    this.focusedString = focusedString;
  }

  private _play(): void {
    if (this.playingAudio) {
      this.stop();
    }
    this.forceStop = false;
    this.playingAudio = new Audio(getSoundFileUrl(this.currentString, this.deviceSettings.tunerToneType));
    this.playingAudio.play().then(() => {
      if (!this.playingAudio) {
        return;
      }
      this.playingAudio.addEventListener('ended', () => {
        if (this.destroyed) {
          return;
        }
        this.playingAudio = undefined;
        if (this.deviceSettings.tunerRepeatMode && !this.forceStop) {
          this._play();
        }
        this.cdr.markForCheck();
      });
    });
    this.cdr.markForCheck();
  }

  stop(): void {
    if (this.playingAudio) {
      this.playingAudio.pause();
      this.playingAudio = undefined;
    }
  }

  isPlaying(guitarString?: string): boolean {
    return !!this.playingAudio && (!guitarString || guitarString === this.currentString);
  }

  getRepeatMode(): boolean {
    return this.deviceSettings.tunerRepeatMode;
  }

  setRepeatMode(repeat: boolean): void {
    this.uds.setUserDeviceSettings({ ...this.deviceSettings, tunerRepeatMode: repeat }).then();
  }

  onRepeatModeCheckboxChanged(event: Event) {
    this.setRepeatMode((event.target as HTMLInputElement).checked);
  }

  getToneType(): TunerToneType {
    return this.deviceSettings.tunerToneType;
  }

  setToneType(toneType: TunerToneType): void {
    this.uds.setUserDeviceSettings({ ...this.deviceSettings, tunerToneType: toneType }).then();
  }

  private getStringElement(guitarString: string): ElementRef | undefined {
    const stringNum = getGuitarStringIndex(guitarString) + 1;
    switch (stringNum) {
      case 1:
        return this.s1;
      case 2:
        return this.s2;
      case 3:
        return this.s3;
      case 4:
        return this.s4;
      case 5:
        return this.s5;
      case 6:
        return this.s6;
    }
    return undefined;
  }
}

function getSoundFileUrl(guitarString: string, soundType: string): string {
  const stringNumber = getGuitarStringIndex(guitarString) + 1;
  const soundPrefix = soundType.substring(0, 1).toLowerCase();
  return '/assets/tuner/' + soundPrefix + stringNumber + '.mp3';
}

function getGuitarStringIndex(guitarString: string): number {
  const n = GUITAR_STRINGS.indexOf(guitarString);
  return n >= 0 ? n : 0;
}
