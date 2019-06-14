export interface Chord {
  name: string;
  minor?: boolean;
  suffix?: string;
}

export interface ChordLocation {
  chord: Chord;
  startIdx: number;
  endIdx: number; // exclusive
}

const CHORD_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const CHORD_SHARP_FLAT = ['#', 'b'];
const CHORD_MINOR_MAJOR = ['major', 'maj', 'minor', 'min', 'M', 'm'];
const CHORD_SUFFIXES = [
  '4',
  '5', '+5', '-5',
  '6-5', '6/9', '6-9', '6',
  '+7', '7-5', '7+5', '7',
  '/9', '/-9', '-9', '/+9', '9',
  '/11', '11', '+'
  , 'sus2', 'sus4', 'sus', '7sus2', '7sus4', '7sus', 'dim', 'add9', 'add11'
];

const VALID_CHORD_CHARS = new Set<string>();
[CHORD_NAMES, CHORD_SHARP_FLAT, CHORD_MINOR_MAJOR, CHORD_SUFFIXES].forEach(arr => {
  for (const line of arr) {
    for (let i = 0; i < line.length; i++) {
      VALID_CHORD_CHARS.add(line.charAt(i));
    }
  }
});

function startsWithAny(text: string, idx: number, tokens: string[]): number {
  for (const token of tokens) {
    if (text.startsWith(token, idx)) {
      return token.length;
    }
  }
  return -1;
}

const ALPHA_EN = /^[A-Z]+$/i;
const ALPHA_RU = /^[А-ЯЁ]+$/i;

function isAlpha(text: string): boolean {
  return ALPHA_EN.test(text) || ALPHA_RU.test(text);
}

export function parseChords(text: string): ChordLocation[] {
  const allChords: ChordLocation[] = [];
  for (let idx = 0; idx < text.length;) {
    let lineEndIdx = text.indexOf('\n', idx);
    if (lineEndIdx === -1) {
      lineEndIdx = text.length;
    }
    const lineChords = parseChordsLine(text, idx, lineEndIdx);
    for (const chord of lineChords) {
      allChords.push(chord);
    }
    idx = lineEndIdx + 1;
  }
  return allChords;
}

export function parseChordsLine(text: string, startIdx?: number, endIdx?: number): ChordLocation[] {
  const minIdx = startIdx === undefined ? 0 : startIdx;
  let idx = minIdx;
  let chordLocations: ChordLocation[] = [];
  let maxIdx = endIdx;
  if (maxIdx === undefined) {
    const lineSepIdx = text.indexOf('\n');
    maxIdx = lineSepIdx === -1 ? text.length : lineSepIdx;
  } else {
    maxIdx = Math.min(maxIdx, text.length);
  }
  while (idx < maxIdx) {
    const c = text.charAt(idx);
    const alpha = isAlpha(c);
    if (!alpha) {
      idx++;
      continue;
    }
    const chordLocation = parseLeadingChord(text, idx, maxIdx);
    if (chordLocation === undefined) {
      if (chordLocations.length == 1) {
        const firstChordLocation = chordLocations[0];
        if (isSingleLetterChord(firstChordLocation) && firstChordLocation.chord.name === 'A') { // special heuristics for text lines that starts with 'A'
          return [];
        }
      }
      idx++;
      continue;
    }
    chordLocations.push(chordLocation);
    idx += chordLocation.endIdx - chordLocation.startIdx;
  }
  // strings-like lines heuristics: A|--1-2-3--x-
  if (chordLocations.length === 1 && isSingleLetterChord(chordLocations[0])) {
    const textWithoutChord = text.substring(minIdx, maxIdx).replace(chordLocations[0].chord.name, '');
    if (isStringTabLikeLine(textWithoutChord)) {
      return [];
    }
  }
  return chordLocations;
}

function isSingleLetterChord(c: ChordLocation): boolean {
  return c.endIdx - c.startIdx === 1;
}

function isStringTabLikeLine(text: string): boolean {
  let dashCount = 0;
  let alpha: string|undefined = undefined; // allow only 1 extra alpha per string
  for (let idx = 0; idx < text.length; idx++) {
    const c = text.charAt(idx);
    if (c === '-') {
      dashCount++;
    } else if (isAlpha(c)) {
      if (alpha !== undefined && alpha !== c) {
        return false;
      }
      alpha = c;
    }
  }
  return dashCount >= 2;
}

class ChordBuf {
  sharpOrFlat?: string;
  minorOrMajor?: string;
  suffix?: string;
  suffixTokensCount = 0;

  constructor(readonly name: string) {
  }

  toChord(): Chord {
    const name = this.name + (this.sharpOrFlat === '#' ? '#' : this.sharpOrFlat === 'b' ? 'b' : '');
    const minor = this.minorOrMajor === 'm' || this.minorOrMajor === 'min' || this.minorOrMajor === 'minor' || undefined;
    // avoid keys with 'undefined' values to simplify testing.
    return minor === undefined && this.suffix === undefined ? {name} : minor === undefined ? {name, suffix: this.suffix} : {name, minor};
  }
}

export function parseLeadingChord(text: string, startIdx?: number, endIdx?: number): ChordLocation|undefined {
  let idx = startIdx === undefined ? 0 : startIdx;
  const d = startsWithAny(text, idx, CHORD_NAMES);
  if (d != 1) {
    return undefined;
  }
  const cb = new ChordBuf(text.substring(idx, idx + d));
  idx += d;
  let maxIdx = Math.min(text.length, endIdx === undefined ? text.length : endIdx);
  while (idx < maxIdx) {
    const c = text.charAt(idx);
    if (!VALID_CHORD_CHARS.has(c)) {
      break;
    }
    if (!cb.suffix) {
      if (!cb.sharpOrFlat) {
        const d = startsWithAny(text, idx, CHORD_SHARP_FLAT);
        if (d == 1) {
          cb.sharpOrFlat = text.substring(idx, idx + d);
          idx += d;
          continue;
        }
      }
      if (!cb.minorOrMajor) {
        const d = startsWithAny(text, idx, CHORD_MINOR_MAJOR);
        if (d > 0) {
          cb.minorOrMajor = text.substring(idx, idx + d);
          idx += d;
          continue;
        }
      }
    }
    if (cb.suffixTokensCount < 2) {
      const d = startsWithAny(text, idx, CHORD_SUFFIXES);
      if (d > 0) {
        cb.suffix = (cb.suffix || '') + text.substring(idx, idx + d);
        cb.suffixTokensCount++;
        idx += d;
        continue;
      }
    }
    break;
  }
  return {chord: cb.toChord(), startIdx: startIdx === undefined ? 0 : startIdx, endIdx: idx};
}
