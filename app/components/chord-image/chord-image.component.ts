import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { ChordImagePainter } from '@app/utils/chord-image-painter';
import { ChordLayout } from '@common/util/chords-layout-lib';
import { isPlatformBrowser } from '@angular/common';
import { VISUAL_TYPE_BY_CHORD_TYPE } from '@common/util/chords-parser-lib';
import { I18N } from '@app/app-i18n';
import { getToneWithH4SiFix } from '@common/util/chords-renderer';
import { getDefaultH4SiFlag } from '@common/user-model';

@Component({
    selector: 'gt-chord-image',
    templateUrl: './chord-image.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class ChordImageComponent implements AfterViewInit, OnChanges {
  @Input({ required: true }) layout!: ChordLayout;
  @Input() size = 2.3;
  @Input() h4Si = getDefaultH4SiFlag();

  width = 70;
  height = 90;

  readonly i18n = I18N.chordImage;

  private readonly isBrowser: boolean;
  private painter!: ChordImagePainter;

  @ViewChild('canvas', { static: true }) canvas!: ElementRef;

  constructor() {
    const platformId = inject(PLATFORM_ID);

    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnChanges(): void {
    if (!this.isBrowser) {
      return;
    }
    const { chord } = this.layout;
    const visualTone = getToneWithH4SiFix(this.h4Si, chord.tone);
    const visualBassToneSuffix = chord.bassTone ? '/' + getToneWithH4SiFix(this.h4Si, chord.bassTone) : '';
    const visualChordName = visualTone + VISUAL_TYPE_BY_CHORD_TYPE.get(chord.type) + visualBassToneSuffix;
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
    const { chord } = this.layout;
    return getToneWithH4SiFix(this.h4Si, chord.tone) + chord.type;
  }
}
