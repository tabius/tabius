import {VISUAL_TYPE_BY_CHORD_TYPE} from '@app/utils/chords-parser-lib';
import {parseChords} from '@app/utils/chords-parser';
import {isAlpha} from '@common/util/misc-utils';
import {Chord, ChordTone} from '@app/utils/chords-lib';

export interface ChordRenderingOptions {
  readonly tag?: string;
  readonly transpose?: number;
  readonly useH?: boolean;
  /** If defined and is 'true' lines with chords will not be rendered at all. */
  readonly hideChords?: boolean;
}

export const TONES_COUNT = 12;

export function getToneNumberByTone(tone: ChordTone): number {
  switch (tone) {
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
      return 10;
    case 'B':
      return 11;
  }
  throw new Error(`Bad tone: ${tone}`);
}

export function getToneByToneNumber(toneNumber: number, isFlat = false): ChordTone {
  switch (toneNumber) {
    case 0:
      return 'C';
    case 1:
      return isFlat ? 'Db' : 'C#';
    case 2:
      return 'D';
    case 3:
      return isFlat ? 'Eb' : 'D#';
    case 4:
      return 'E';
    case 5:
      return 'F';
    case 6:
      return isFlat ? 'Gb' : 'F#';
    case 7:
      return 'G';
    case 8:
      return isFlat ? 'Ab' : 'G#';
    case 9:
      return 'A';
    case 10:
      return isFlat ? 'Bb' : 'A#';
    case 11:
      return 'B';
  }
  throw new Error(`Illegal tone number: ${toneNumber}`);
}

export function isSharp(tone: ChordTone): boolean {
  return tone.endsWith('#');
}

export function isFlat(tone: ChordTone): boolean {
  return tone.endsWith('b');
}

/** Transposes tone up to semi-tones. If isFlat is true, the result value will be flat otherwise sharp if applied. */
export function transpose(tone: ChordTone, semiTones: number, isFlat = false): ChordTone {
  const oldToneNumber = getToneNumberByTone(tone);
  const newToneNumber = (oldToneNumber + (semiTones % TONES_COUNT) + TONES_COUNT) % TONES_COUNT;
  return getToneByToneNumber(newToneNumber, isFlat);
}

export function renderChord(chord: Chord, options: ChordRenderingOptions = {}, minResultStringLength = 0): string {
  let {tone, bassTone} = chord;
  if (options.transpose) {
    tone = transpose(tone, options.transpose);
    bassTone = bassTone ? transpose(bassTone, options.transpose) : undefined;
  }

  // Handle 'B' & 'H'
  let toneString: string = tone;
  if (options.useH) {
    if (tone.charAt(0) === 'B') {
      toneString = 'H' + tone.substring(1);
    }
    if (bassTone?.charAt(0) === 'B') {
      bassTone = ('H' + bassTone.substring(1)) as ChordTone;
    }
  }

  const visualType = chord.type ? VISUAL_TYPE_BY_CHORD_TYPE.get(chord.type) || '' : '';
  const bassSuffix = bassTone ? `/${bassTone}` : '';
  const chordString = `${toneString + visualType + bassSuffix}`;
  const trailingSpaceCount = minResultStringLength - chordString.length;
  const trailingSpaces = trailingSpaceCount > 0 ? ' '.repeat(trailingSpaceCount) : '';
  const {tag} = options;
  return (tag ? `<${tag}>${chordString}</${tag}>` : chordString) + trailingSpaces;
}

export function renderChords(text: string, options: ChordRenderingOptions = {}): string {
  const {tag, transpose, hideChords} = options;
  if (!tag && !transpose && !hideChords) {
    return text;
  }
  const chordLocations = parseChords(text);
  if (chordLocations.length === 0) {
    return text;
  }
  let result = '';
  let prevChordEndIdx = 0;
  const linesWithStrippedChords = new Set<number>();
  let currentLineNum = 0;
  for (const chordLocation of chordLocations) {
    if (prevChordEndIdx < chordLocation.startIdx) {
      const dText = text.substring(prevChordEndIdx, chordLocation.startIdx);
      result += dText;
      currentLineNum += hideChords ? countChar(dText, '\n') : 0;
    }
    if (hideChords) {
      prevChordEndIdx = skipSpaces(text, chordLocation.endIdx);
      linesWithStrippedChords.add(currentLineNum);
    } else {
      result += renderChord(chordLocation.chord, options, chordLocation.endIdx - chordLocation.startIdx);
      prevChordEndIdx = chordLocation.endIdx;
    }
  }
  result += text.substring(prevChordEndIdx, text.length);

  if (linesWithStrippedChords.size > 0) {
    result = result.split('\n').reduce((sum, line, idx) => {
      return sum + (linesWithStrippedChords.has(idx) && containsNonAlphaCharsOnly(line) ? '' : (idx > 0 ? '\n' : '') + line);
    }, '');
  }
  return result;
}

/** Skips all space chars starting from startIdx and returns first non-space space idx. */
function skipSpaces(text: string, startIdx: number): number {
  let idx = startIdx;
  for (; idx < text.length; idx++) {
    if (text.charAt(idx) !== ' ') {
      break;
    }
  }
  return idx;
}

/** Returns number of 'char' occurrences in the string. */
function countChar(text: string, char: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charAt(i) === char) {
      count++;
    }
  }
  return count;
}

function containsNonAlphaCharsOnly(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (isAlpha(text.charAt(i))) {
      return false;
    }
  }
  return true;
}

export function getToneWithH4SiFix(h4Si: boolean, tone: ChordTone): string {
  return h4Si && tone.charAt(0) === 'B' ? `H${tone.substring(1)}` : tone;
}
