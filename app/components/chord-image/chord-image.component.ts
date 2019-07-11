import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Inject, Input, OnChanges, PLATFORM_ID, ViewChild} from '@angular/core';
import {ChordImagePainter} from '@app/utils/chord-image-painter';
import {ChordLayout} from '@app/utils/chords-layout-lib';
import {isPlatformBrowser} from '@angular/common';
import {VISUAL_TYPE_BY_CHORD_TYPE} from '@app/utils/chords-parser-lib';

@Component({
  selector: 'gt-chord-image',
  templateUrl: './chord-image.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChordImageComponent implements AfterViewInit, OnChanges {

  @Input() layout!: ChordLayout;
  @Input() scale = 2;

  width = 32;
  height = 32;

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
    const visualChordName = chord.tone + VISUAL_TYPE_BY_CHORD_TYPE.get(chord.type);
    this.painter = new ChordImagePainter(visualChordName, this.layout.positions, this.layout.fingers, this.scale);
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

  getChordDisplayName(): string {
    const {chord} = this.layout;
    return chord.tone + chord.type;
  }
}
