export interface Chord {
  name: string;
  minor?: boolean;
  suffix?: string;
}

export interface ChordRenderingOptions {
  tag?: string;
  transpose?: number;
  useH?: boolean;
}

export const TONES_COUNT = 12;

export function getToneNumberByName(toneName: string): number {
  switch (toneName) {
    case 'C':
      return 0;
    case 'C#':
    case 'Db':
      return 1;
    case 'D':
      return 2;
    case 'D#':
    case 'Eb':
      return 3;
    case 'E':
      return 4;
    case 'F':
      return 5;
    case 'F#':
    case 'Gb':
      return 6;
    case 'G':
      return 7;
    case 'G#':
    case 'Ab':
      return 8;
    case 'A':
      return 9;
    case 'A#':
    case 'Bb':
    case 'Hb':
      return 10;
    case 'B':
    case 'H':
      return 11;
  }
  throw new Error(`Bad tone: ${toneName}`);
}

export function getToneNameByNumber(toneNumber: number, flat?: boolean): string {
  switch (toneNumber) {
    case 0:
      return 'C';
    case 1:
      return flat ? 'Db' : 'C#';
    case 2:
      return 'D';
    case 3:
      return flat ? 'Eb' : 'D#';
    case 4:
      return 'E';
    case 5:
      return 'F';
    case 6:
      return flat ? 'Gb' : 'F#';
    case 7:
      return 'G';
    case 8:
      return flat ? 'Ab' : 'G#';
    case 9:
      return 'A';
    case 10:
      return flat ? 'Bb' : 'A#';
    case 11:
      return 'B';
  }
  throw new Error(`Illegal tone number: ${toneNumber}`);
}

export function renderChord(chord: Chord, options: ChordRenderingOptions): string {
  let name = chord.name;
  if (options.transpose) {
    const oldToneNumber = getToneNumberByName(name);
    const newToneNumber = (oldToneNumber + (options.transpose % TONES_COUNT) + TONES_COUNT) % TONES_COUNT;
    name = getToneNameByNumber(newToneNumber);
  }

  // Handle 'B' & 'H'
  const fullTone = name.charAt(0);
  if (fullTone === 'H' && !options.useH) {
    name = 'B' + name.substring(1);
  } else if (fullTone === 'B' && options.useH) {
    name = 'H' + name.substring(1);
  }

  const chordString = `${name + (chord.minor ? 'm' : '') + (chord.suffix || '')}`;
  const {tag} = options;
  return tag ? `<${tag}>${chordString}</${tag}>` : chordString;
}

export function renderChords(text: string, options: ChordRenderingOptions): string {
  if (!options.tag && !options.transpose) {
    return text;
  }
  const chordLocations = parseChords(text);
  if (chordLocations.length === 0) {
    return text;
  }
  let result = '';
  let prevChordEndIdx = 0;
  for (let chordLocation of chordLocations) {
    if (prevChordEndIdx > 0) {
      result += text.substring(prevChordEndIdx, chordLocation.startIdx);
    }
    result += renderChord(chordLocation.chord, options);
    prevChordEndIdx = chordLocation.endIdx;
  }
  result += text.substring(prevChordEndIdx, text.length);
  return result;
}

export interface ChordLocation {
  chord: Chord;
  startIdx: number;
  endIdx: number; // exclusive
}

export function parseChords(text: string): ChordLocation[] {
  const result: ChordLocation[] = [];
  let cb: ChordBuf|undefined = undefined;
  let startIdx = 0;
  for (let i = 0; i < text.length;) {
    if (!cb) {
      const d = startsWithAny(text, i, CHORD_NAME);
      if (d == 1) {
        cb = new ChordBuf(text.substring(i, i + d));
        startIdx = i;
        i += d;
        continue;
      }
    }
    if (cb) {
      if (!cb.suffix) {
        if (!cb.sharpOrFlat) {
          const d = startsWithAny(text, i, CHORD_SHARP_FLAT);
          if (d == 1) {
            cb.sharpOrFlat = text.substring(i, i + d);
            i += d;
            continue;
          }
        }
        if (!cb.minorOrMajor) {
          const d = startsWithAny(text, i, CHORD_MINOR_MAJOR);
          if (d > 0) {
            cb.minorOrMajor = text.substring(i, i + d);
            i += d;
            continue;
          }
        }
      }
      if (cb.suffixTokensCount < 2) {
        const d = startsWithAny(text, i, CHORD_SUFFIX);
        if (d > 0) {
          cb.suffix = (cb.suffix || '') + text.substring(i, i + d);
          cb.suffixTokensCount++;
          i += d;
          continue;
        }
      }
    }
    if (cb) {
      result.push({chord: cb.toChord(), startIdx, endIdx: i});
      cb = undefined;
      startIdx = 0;
    }
    i++;
  }
  if (cb != null) {
    result.push({chord: cb.toChord(), startIdx, endIdx: text.length});
  }
  return result;
}


const CHORD_NAME = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const CHORD_SHARP_FLAT = ['#', 'b'];
const CHORD_MINOR_MAJOR = ['major', 'maj', 'minor', 'min', 'M', 'm'];
const CHORD_SUFFIX = ['4', '5', '+5', '-5', '6', '6-5', '6/9', '6-9', '7', '+7'
  , '7-5', '7+5', '/9', '9', '/-9', '-9', '/+9', '/11', '11', 'sus2', 'sus4', '7sus2', '7sus4', 'dim', 'add9', 'add11'];

class ChordBuf {
  sharpOrFlat?: string;
  minorOrMajor?: string;
  suffix?: string;
  suffixTokensCount = 0;

  constructor(readonly name: string) {
  }

  toChord(): Chord {
    return {
      name: this.name + (this.sharpOrFlat === '#' ? '#' : this.sharpOrFlat === 'b' ? 'b' : ''),
      minor: this.minorOrMajor === 'm' || this.minorOrMajor === 'min' || this.minorOrMajor === 'minor',
      suffix: this.suffix,
    };
  }
}

function startsWithAny(text: string, i: number, tokens: string[]): number {
  for (const token of tokens) {
    if (text.startsWith(token, i)) {
      return token.length;
    }
  }
  return -1;
}
