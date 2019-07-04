import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Inject, Input, OnChanges, PLATFORM_ID, ViewChild} from '@angular/core';
import {ChordImagePainter} from '@app/utils/chord-image-painter';
import {ChordLayout} from '@app/utils/chords-layout-lib';
import {isPlatformBrowser} from '@angular/common';

@Component({
  selector: 'gt-chord-image',
  templateUrl: './chord-image.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChordImageComponent implements AfterViewInit, OnChanges {

  @Input() chord!: ChordLayout;
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
    this.painter = new ChordImagePainter(this.chord.name, this.chord.positions, this.chord.fingers, this.scale);
    this.width = this.painter.imageWidth;
    this.height = this.painter.imageHeight;
  }

  ngAfterViewInit(): void {
    const context = this.canvas.nativeElement.getContext('2d');
    this.painter.draw(context);
  }
}
