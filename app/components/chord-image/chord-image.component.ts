import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Inject, Input, OnChanges, PLATFORM_ID, ViewChild} from '@angular/core';
import {ChordImagePainter} from '@app/utils/chord-image-painter';
import {ChordLayout} from '@app/utils/chords-layout-lib';
import {isPlatformBrowser} from '@angular/common';
import {ChordTone, VISUAL_TYPE_BY_CHORD_TYPE} from '@app/utils/chords-parser-lib';
import {I18N} from '@app/app-i18n';

@Component({
  selector: 'gt-chord-image',
  templateUrl: './chord-image.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChordImageComponent implements AfterViewInit, OnChanges {

  @Input() layout!: ChordLayout;
  @Input() size = 2.3;
  @Input() h4Si = false;

  width = 70;
  height = 90;

  readonly i18n = I18N.chordImage;

  private readonly isBrowser: boolean;
  private painter!: ChordImagePainter;

  @ViewChild('canvas', {static: true}) canvas!: ElementRef;

  constructor(@Inject(PLATFORM_ID) platformId: string) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnChanges(): void {
    if (!this.isBrowser) {
      return;
    }
    const {chord} = this.layout;
    const visualChordName = this.getToneWithH4SiFix(chord.tone) + VISUAL_TYPE_BY_CHORD_TYPE.get(chord.type);
    this.painter = new ChordImagePainter(visualChordName, this.layout.positions, this.layout.fingers, this.size);
    this.width = this.painter.imageWidth;
    this.height = this.painter.imageHeight;
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) {
      return;
    }
    const context = this.canvas.nativeElement.getContext('2d');
    this.painter.draw(context);
  }

  getChordTextForTitle(): string {
    const {chord} = this.layout;
    return this.getToneWithH4SiFix(chord.tone) + chord.type;
  }

  private getToneWithH4SiFix(tone: ChordTone): string {
    return this.h4Si && tone.charAt(0) === 'B' ? `H${tone.substring(1)}` : tone;
  }
}
