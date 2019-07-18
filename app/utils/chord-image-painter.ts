/*
 * Based On "Chord Image Generator" http://einaregilsson.com/2009/07/23/chord-image-generator/
 */

import {bound} from '@common/util/misc-utils';

const NO_FINGER = '-';
const OPEN = 0;
const MUTED = -1;
const FRET_COUNT = 5;
const FONT_NAME = 'Ubuntu Mono';
const FOREGROUND_BRUSH = '#000';
const BACKGROUND_BRUSH = '#FFF';

interface ChordImageStyle {
  apply(ctx: CanvasRenderingContext2D): void;
}

class ChordImagePenStyle implements ChordImageStyle {
  constructor(public color: string, public size: number) {
  }

  apply(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.size;
    ctx.lineCap = 'round';
  }
}

class ChordImageFontStyle implements ChordImageStyle {
  constructor(public fontName: string, public size: number) {
  }

  apply(ctx: CanvasRenderingContext2D): void {
    ctx.font = `${this.size}px ${this.fontName}`;
    ctx.textBaseline = 'top';
  }
}

class ChordImageGraphics {
  constructor(private ctx: CanvasRenderingContext2D) {
  }

  drawLine(style: ChordImageStyle, x1: number, y1: number, x2: number, y2: number): void {
    this.ctx.beginPath();
    style.apply(this.ctx);
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  fillRectangle(color: string, x1: number, y1: number, x2: number, y2: number): void {
    this.ctx.beginPath();
    this.ctx.fillStyle = color;
    this.ctx.rect(x1, y1, x2, y2);
    this.ctx.fill();
  }

  drawCircle(style: ChordImageStyle, x1: number, y1: number, diameter: number): void {
    const radius = diameter / 2;
    this.ctx.beginPath();
    style.apply(this.ctx);
    this.ctx.arc(x1 + radius, y1 + radius, radius, 0, 2 * Math.PI, false);
    this.ctx.stroke();
  }

  fillCircle(color: string, x1: number, y1: number, diameter: number): void {
    const radius = diameter / 2;
    this.ctx.beginPath();
    this.ctx.fillStyle = color;
    this.ctx.arc(x1 + radius, y1 + radius, radius, 0, 2 * Math.PI, false);
    this.ctx.fill();
  }

  measureString(text: string, style: ChordImageStyle): TextMetrics {
    style.apply(this.ctx);
    return this.ctx.measureText(text);
  }

  drawString(text: string, style: ChordImageStyle, color: string, x: number, y: number): void {
    style.apply(this.ctx);
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y);
  }
}

export class ChordImagePainter {
  readonly size: number;
  readonly chordPositions: number[] = [];
  readonly fingers = [NO_FINGER, NO_FINGER, NO_FINGER, NO_FINGER, NO_FINGER, NO_FINGER];
  readonly chordName: string;

  readonly fretWidth: number;
  readonly lineWidth: number;
  readonly boxWidth: number;
  readonly boxHeight: number;

  readonly imageWidth: number;
  readonly imageHeight: number;

  readonly xStart: number; //upper corner of the chord box
  readonly yStart: number;
  readonly nutHeight: number;

  readonly dotWidth: number;
  readonly signWidth: number;
  readonly signRadius: number;

  //Different font sizes
  readonly fretFontSize: number;
  readonly fingerFontSize: number;
  readonly nameFontSize: number;
  readonly superScriptFontSize: number;
  readonly markerWidth: number;

  error?: boolean;

  private baseFret = 0;

  constructor(name: string, positions: string, fingers: string, size: number) {
    // parse chord name
    this.chordName = !name ? '' : name.replace(' ', '');

    this.parsePositions(positions);

    // parse fingers
    let f = String(fingers).toUpperCase() + '------';
    f = f.replace(/[^\-T1234]/g, '');
    this.fingers = f.substr(0, 6).split('');

    // set up sizes
    this.size = bound(1, size, 5);
    this.fretWidth = 4 * this.size;
    this.nutHeight = this.fretWidth / 2;
    this.lineWidth = Math.ceil(this.size * 0.31);
    this.dotWidth = Math.ceil(0.9 * this.fretWidth);
    this.markerWidth = 0.7 * this.fretWidth;
    this.boxWidth = 5 * this.fretWidth + 6 * this.lineWidth;
    this.boxHeight = FRET_COUNT * (this.fretWidth + this.lineWidth) + this.lineWidth;
    const percent = 0.8;
    this.fretFontSize = this.fretWidth / percent;
    this.fingerFontSize = this.fretWidth * 0.8;
    this.nameFontSize = Math.max(Math.round(this.fretWidth * 1.7) / percent, 20);
    this.superScriptFontSize = 0.7 * this.nameFontSize;
    if (this.size == 1) {
      this.nameFontSize += 2;
      this.fingerFontSize += 2;
      this.fretFontSize += 2;
      this.superScriptFontSize += 2;
    }
    this.xStart = this.fretWidth;
    this.yStart = Math.round(0.2 * this.superScriptFontSize + this.nameFontSize + this.nutHeight + 1.7 * this.markerWidth);
    this.imageWidth = this.boxWidth + 2 * this.fretWidth; // +2 fret width for borders
    this.imageHeight = this.boxHeight + this.yStart;
    this.signWidth = this.fretWidth * 0.75;
    this.signRadius = this.signWidth / 2;
  }


  private parsePositions(positions: string): void {
    if (positions == null || typeof positions == 'undefined' || !positions.match(/[\dxX]{6}|(([12])?[\dxX]-){5}([12])?[\dxX]/)) {
      this.error = true;
      return;
    }
    const parts = positions.length > 6 ? positions.split('-') : positions.split('');
    let maxFret = 0;
    let minFret = Number.MAX_VALUE;
    for (let i = 0; i < 6; i++) {
      if (parts[i].toUpperCase() == 'X') {
        this.chordPositions[i] = MUTED;
      } else {
        this.chordPositions[i] = parseInt(parts[i]);
        maxFret = Math.max(maxFret, this.chordPositions[i]);
        if (this.chordPositions[i] != 0) {
          minFret = Math.min(minFret, this.chordPositions[i]);
        }
      }
    }
    this.baseFret = maxFret <= 5 ? 1 : minFret;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const graphics = new ChordImageGraphics(ctx);
    graphics.fillRectangle(BACKGROUND_BRUSH, 0, 0, this.imageWidth, this.imageHeight);
    if (this.error) {
      //Draw red x
      const errorPen = new ChordImagePenStyle('red', 3);
      graphics.drawLine(errorPen, 0, 0, this.imageWidth, this.imageHeight);
      graphics.drawLine(errorPen, 0, this.imageHeight, this.imageWidth, 0);
    } else {
      this.drawChordBox(graphics);
      this.drawPositions(graphics);
      this.drawName(graphics);
      //TODO: make optional: this.drawFingers();
      this.drawBars(graphics);
    }
  }

  private drawChordBox(graphics: ChordImageGraphics): void {
    const pen = new ChordImagePenStyle(FOREGROUND_BRUSH, this.lineWidth);
    const totalFretWidth = this.fretWidth + this.lineWidth;

    for (let i = 0; i <= FRET_COUNT; i++) {
      const y = this.yStart + i * totalFretWidth;
      graphics.drawLine(pen, this.xStart, y, this.xStart + this.boxWidth - this.lineWidth, y);
    }

    for (let i = 0; i < 6; i++) {
      const x = this.xStart + (i * totalFretWidth);
      graphics.drawLine(pen, x, this.yStart, x, this.yStart + this.boxHeight - this.lineWidth);
    }

    if (this.baseFret == 1) {
      //Need to draw the nut
      const nutHeight = this.fretWidth / 2;
      graphics.fillRectangle(FOREGROUND_BRUSH, this.xStart - this.lineWidth / 2, this.yStart - nutHeight, this.boxWidth, nutHeight);
    }
  }

  private drawBars(graphics: ChordImageGraphics): void {
    const bars = {};
    for (let i = 0; i < 5; i++) {
      if (this.chordPositions[i] != MUTED && this.chordPositions[i] != OPEN && this.fingers[i] != NO_FINGER && !bars.hasOwnProperty(this.fingers[i])) {
        let bar = {'Str': i, 'Pos': this.chordPositions[i], 'Length': 0, 'Finger': this.fingers[i]};
        for (let j = i + 1; j < 6; j++) {
          if (this.fingers[j] == bar['Finger'] && this.chordPositions[j] == this.chordPositions[i]) {
            bar['Length'] = j - i;
          }
        }
        if (bar['Length'] > 0) {
          bars[bar['Finger']] = bar;
        }
      }
    }

    const totalFretWidth = this.fretWidth + this.lineWidth;
    for (let b in bars) {
      if (bars.hasOwnProperty(b)) {
        let bar = bars[b];
        const xStart = this.xStart + bar['Str'] * totalFretWidth;
        const xEnd = xStart + bar['Length'] * totalFretWidth;
        const y = this.yStart + (bar['Pos'] - this.baseFret + 1) * totalFretWidth - (totalFretWidth / 2);
        const pen = new ChordImagePenStyle(FOREGROUND_BRUSH, this.dotWidth / 2);
        graphics.drawLine(pen, xStart, y, xEnd, y);
      }
    }
  }

  private drawPositions(graphics: ChordImageGraphics): void {
    const yOffset = this.yStart - this.fretWidth;
    const totalFretWidth = this.fretWidth + this.lineWidth;
    for (let i = 0; i < this.chordPositions.length; i++) {
      const absolutePos = this.chordPositions[i];
      const relativePos = absolutePos - this.baseFret + 1;

      const xPos = this.xStart - (0.5 * this.fretWidth) + (0.5 * this.lineWidth) + (i * totalFretWidth);
      if (relativePos > 0) {
        let yPos = relativePos * totalFretWidth + yOffset;
        graphics.fillCircle(FOREGROUND_BRUSH, xPos, yPos, this.dotWidth);
      } else if (absolutePos == OPEN) {
        let pen = new ChordImagePenStyle(FOREGROUND_BRUSH, this.lineWidth);
        let yPos = this.yStart - this.fretWidth;
        let markerXPos = xPos + ((this.dotWidth - this.markerWidth) / 2);
        if (this.baseFret == 1) {
          yPos -= this.nutHeight;
        }
        graphics.drawCircle(pen, markerXPos, yPos, this.markerWidth);
      } else if (absolutePos == MUTED) {
        let pen = new ChordImagePenStyle(FOREGROUND_BRUSH, this.lineWidth * 1.5);
        let yPos = this.yStart - this.fretWidth;
        let markerXPos = xPos + ((this.dotWidth - this.markerWidth) / 2);
        if (this.baseFret == 1) {
          yPos -= this.nutHeight;
        }
        graphics.drawLine(pen, markerXPos, yPos, markerXPos + this.markerWidth, yPos + this.markerWidth);
        graphics.drawLine(pen, markerXPos, yPos + this.markerWidth, markerXPos + this.markerWidth, yPos);
      }
    }
  }

  //noinspection JSUnusedLocalSymbols
  private drawFingers(graphics: ChordImageGraphics): void {
    let xPos = this.xStart + (0.5 * this.lineWidth);
    const yPos = this.yStart + this.boxHeight;
    const fontStyle = new ChordImageFontStyle(FONT_NAME, this.fingerFontSize);
    for (let f = 0; f < this.fingers.length; f++) {
      const finger = this.fingers[f];
      if (finger != NO_FINGER) {
        const charSize = graphics.measureString(finger.toString(), fontStyle);
        graphics.drawString(finger.toString(), fontStyle, FOREGROUND_BRUSH, xPos - (0.5 * charSize.width), yPos);
      }
      xPos += (this.fretWidth + this.lineWidth);
    }
  }

  private drawName(graphics: ChordImageGraphics): void {
    const nameFontStyle = new ChordImageFontStyle(FONT_NAME, this.nameFontSize);
    const superFontStyle = new ChordImageFontStyle(FONT_NAME, this.superScriptFontSize);
    let name;
    let supers;
    if (this.chordName.indexOf('_') == -1) {
      name = this.chordName;
      supers = '';
    } else {
      const parts = this.chordName.split('_');
      name = parts[0];
      supers = parts[1];
    }
    const stringSize = graphics.measureString(name, nameFontStyle);

    let xTextStart = this.xStart;
    if (stringSize.width < this.boxWidth) {
      xTextStart = this.xStart + ((this.boxWidth - stringSize.width) / 2);
    }
    graphics.drawString(name, nameFontStyle, FOREGROUND_BRUSH, xTextStart, 0.2 * this.superScriptFontSize);
    if (supers != '') {
      graphics.drawString(supers, superFontStyle, FOREGROUND_BRUSH, xTextStart + 0.8 * stringSize.width, 0);
    }

    if (this.baseFret > 1) {
      const fretFontStyle = new ChordImageFontStyle(FONT_NAME, this.fretFontSize);
      const offset = (this.fretFontSize - this.fretWidth) / 2;
      graphics.drawString(this.baseFret + 'fr', fretFontStyle, FOREGROUND_BRUSH, this.xStart + this.boxWidth + 0.4 * this.fretWidth, this.yStart - offset);
    }
  }
}
