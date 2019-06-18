import {ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit} from '@angular/core';
import {Meta, Title} from '@angular/platform-browser';
import {updatePageMetadata} from '@app/utils/seo-utils';

const GUITAR_STRINGS = ['e', 'H', 'G', 'D', 'A', 'E'];

@Component({
  selector: 'gt-tuner-page',
  templateUrl: './tuner-page.component.html',
  styleUrls: ['./tuner-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TunerPageComponent implements OnInit {
  currentString = 'e';
  soundType = 'c';
  repeat = false;
  playingAudio?: HTMLAudioElement;
  forceStop = false;

  constructor(private readonly cd: ChangeDetectorRef,
              private readonly title: Title,
              private readonly meta: Meta,) {
  }

  ngOnInit(): void {
    updatePageMetadata(this.title, this.meta, {
      title: 'Тюнер для гитары',
      description: 'Простой и удобный тюнер для настройки гитары на слух.',
      keywords: ['тюнер для гитары', 'тюнер', 'гитара', 'настройка гитары', 'настройка на слух'],
    });
  }

  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent): void {
    switch (event.code) {
      case 'Space':
        if (this.playingAudio) {
          this.stop();
          this.forceStop = true;
        } else {
          this._play();
        }
        break;
      case 'Digit0':
        this.repeat = !this.repeat;
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
        this.soundType = this.soundType === 'c' ? 'e' : 'c';
        this._play();
        break;
    }
  }

  play(guitarString: string): void {
    this.currentString = guitarString;
    this._play();
  }

  private _play(): void {
    if (this.playingAudio) {
      this.stop();
    }
    this.forceStop = false;
    this.playingAudio = new Audio(getSoundFileUrl(this.currentString, this.soundType));
    this.playingAudio.play().then(() => {
      if (!this.playingAudio) {
        return;
      }
      this.playingAudio.addEventListener('ended', () => {
        this.playingAudio = undefined;
        this.cd.detectChanges();
        if (this.repeat && !this.forceStop) {
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

