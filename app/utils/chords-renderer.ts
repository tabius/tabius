import {Chord, VISUAL_TYPE_BY_CHORD_TYPE_KEY} from '@app/utils/chords-parser-lib';
import {parseChords} from '@app/utils/chords-parser';

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

export function renderChord(chord: Chord, optionsParam?: ChordRenderingOptions): string {
  const options = optionsParam === undefined ? {} : optionsParam;
  let tone = chord.tone;
  if (options.transpose) {
    const oldToneNumber = getToneNumberByName(tone);
    const newToneNumber = (oldToneNumber + (options.transpose % TONES_COUNT) + TONES_COUNT) % TONES_COUNT;
    tone = getToneNameByNumber(newToneNumber);
  }

  // Handle 'B' & 'H'
  const fullTone = tone.charAt(0);
  if (fullTone === 'H' && !options.useH) {
    tone = 'B' + tone.substring(1);
  } else if (fullTone === 'B' && options.useH) {
    tone = 'H' + tone.substring(1);
  }

  const visualType = chord.type ? VISUAL_TYPE_BY_CHORD_TYPE_KEY.get(chord.type) || '' : '';
  const chordString = `${tone + visualType}`;
  const {tag} = options;
  return tag ? `<${tag}>${chordString}</${tag}>` : chordString;
}

export function renderChords(text: string, optionsParam?: ChordRenderingOptions): string {
  const options = optionsParam === undefined ? {} : optionsParam;
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
