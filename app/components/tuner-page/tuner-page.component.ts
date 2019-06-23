import {ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit} from '@angular/core';
import {Meta, Title} from '@angular/platform-browser';
import {updatePageMetadata} from '@app/utils/seo-utils';
import {Subject} from 'rxjs';
import {UserDataService} from '@app/services/user-data.service';
import {takeUntil} from 'rxjs/operators';
import {newDefaultUserDeviceSettings} from '@common/user-model';

const GUITAR_STRINGS = ['e', 'H', 'G', 'D', 'A', 'E'];

@Component({
  selector: 'gt-tuner-page',
  templateUrl: './tuner-page.component.html',
  styleUrls: ['./tuner-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TunerPageComponent implements OnInit, OnDestroy {
  private readonly destroyed$ = new Subject();

  currentString = 'e';
  deviceSettings = newDefaultUserDeviceSettings();
  playingAudio?: HTMLAudioElement;
  forceStop = false;
  focusedString = '';

  constructor(private readonly cd: ChangeDetectorRef,
              private readonly title: Title,
              private readonly meta: Meta,
              private readonly uds: UserDataService,
  ) {
    this.uds.getUserDeviceSettings()
        .pipe(takeUntil(this.destroyed$))
        .subscribe(deviceSettings => {
          this.deviceSettings = deviceSettings;
          this.cd.detectChanges();
        });
  }

  ngOnInit(): void {
    updatePageMetadata(this.title, this.meta, {
      title: 'Тюнер для гитары',
      description: 'Простой и удобный тюнер для настройки гитары на слух.',
      keywords: ['тюнер для гитары', 'тюнер', 'гитара', 'настройка гитары', 'настройка на слух'],
    });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
  }

  @HostListener('window:keydown', ['$event'])
  keyEvent(event: KeyboardEvent): void {
    switch (event.code) {
      case 'Space':
        if (this.playingAudio || this.focusedString === '') {
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
        const guitarString = GUITAR_STRINGS[parseInt(event.code.replace('Digit', '')) - 1];
        this.play(guitarString);
        break;
      case 'ArrowRight':
      case 'KeyX':
        this.play(GUITAR_STRINGS[(getGuitarStringIndex(this.currentString) + 1) % 6]);
        break;
      case 'ArrowLeft':
      case 'KeyZ':
        this.play(GUITAR_STRINGS[(getGuitarStringIndex(this.currentString) + 5) % 6]);
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
        this.playingAudio = undefined;
        this.cd.detectChanges();
        if (this.deviceSettings.tunerRepeatMode && !this.forceStop) {
          this._play();
        }
      });
    });
    this.cd.detectChanges();
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

  setRepeatMode(repeat: boolean): void {
    this.uds.setUserDeviceSettings({...this.deviceSettings, tunerRepeatMode: repeat});
  }

  setToneType(toneType: 'c'|'e'): void {
    this.uds.setUserDeviceSettings({...this.deviceSettings, tunerToneType: toneType});
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
