import {Chord, CHORD_LETTERS, CHORD_TYPE_BY_RAW_TYPE, ChordLocation, ChordType, RAW_CHORD_TYPES_BY_FIRST_CHAR} from '@app/utils/chords-parser-lib';

const ALPHA_EN = /^[A-Z]+$/i;
const ALPHA_RU = /^[А-ЯЁ]+$/i;

export function isAlpha(char: string): boolean {
  return ALPHA_EN.test(char) || ALPHA_RU.test(char);
}

export function isWordChar(char: string): boolean {
  return isAlpha(char) || char == '’';
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
    const chordLocation = parseChord(text, idx, maxIdx);
    if (chordLocation === undefined) {
      if (chordLocations.length == 1) {
        const first = chordLocations[0];
        if (first.endIdx - first.startIdx === 1 && first.chord.tone === 'A') { // special heuristics for text lines that starts with 'A'
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
  if (chordLocations.length === 1 && chordLocations[0].endIdx - chordLocations[0].startIdx <= 2) { // <=2: A or A- (minor)
    const textWithoutChord = text.substring(minIdx, maxIdx).replace(chordLocations[0].chord.tone, '');
    if (isStringTabLikeLine(textWithoutChord)) {
      return [];
    }
  }
  return chordLocations;
}

/** Parses 1 chord starting from the startIdx. */
export function parseChord(text: string, startIdx?: number, endIdx?: number): ChordLocation|undefined {
  let idx = startIdx === undefined ? 0 : startIdx;
  const tone = findPrefixToken(text, idx, CHORD_LETTERS);
  if (tone == undefined) {
    return undefined;
  }
  const chord: Chord = {tone, type: 'maj'};
  let parsedType: ChordType|undefined = undefined;
  idx += tone.length;
  let maxIdx = Math.min(text.length, endIdx === undefined ? text.length : endIdx);
  while (idx < maxIdx) {
    const c = text.charAt(idx);
    if (chord.tone.length === 1 && c === '#' || c === 'b') {
      chord.tone += c;
      idx++;
      continue;
    }
    if (parsedType === undefined) {
      const typesByFirstChar = RAW_CHORD_TYPES_BY_FIRST_CHAR.get(c);
      if (typesByFirstChar !== undefined) {
        const rawType = findPrefixToken(text, idx, typesByFirstChar);
        if (rawType !== undefined) {
          idx += rawType.length;
          chord.type = CHORD_TYPE_BY_RAW_TYPE.get(rawType)!;
          parsedType = chord.type;
          continue;
        }
      }
    }
    if (isWordChar(c)) { // the word continues with some letters -> most probably this is not a chord but an ordinary word.
      return undefined;
    }
    break;
  }
  return {chord, startIdx: startIdx === undefined ? 0 : startIdx, endIdx: idx};
}

function findPrefixToken(text: string, idx: number, tokens: readonly string[]): string|undefined {
  for (const token of tokens) {
    if (text.startsWith(token, idx)) {
      return token;
    }
  }
  return undefined;
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
