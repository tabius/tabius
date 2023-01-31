import {CHORD_TYPE_BY_RAW_NAME, ChordLocation, RAW_CHORD_TYPES_BY_FIRST_CHAR} from '@app/utils/chords-parser-lib';
import {isDefined, isAlpha, isDigit} from '@common/util/misc-utils';
import {Chord, CHORD_TONES, ChordTone, ChordType} from '@app/utils/chords-lib';

function isWordChar(char: string): boolean {
  return isAlpha(char) || char === '’';
}

const CHORD_BASS_SEPARATOR = '/';

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
  const chordLocations: Array<ChordLocation> = [];
  let maxIdx = endIdx;
  if (maxIdx === undefined) {
    const lineSepIdx = text.indexOf('\n');
    maxIdx = lineSepIdx === -1 ? text.length : lineSepIdx;
  } else {
    maxIdx = Math.min(maxIdx, text.length);
  }

  if (isTabsLine(text, minIdx, maxIdx)) {
    return [];
  }

  let prevIsChordSep = true;
  while (idx < maxIdx) {
    const c = text.charAt(idx);
    const alpha = isAlpha(c);
    const isChordSep = !alpha && !isDigit(c);
    if (!alpha || !prevIsChordSep) {
      idx++;
      prevIsChordSep = isChordSep;
      continue;
    }
    prevIsChordSep = isChordSep;
    const chordLocation = parseChord(text, idx, maxIdx);
    if (chordLocation === undefined) {
      idx++;
      continue;
    }
    chordLocations.push(chordLocation);
    idx += chordLocation.endIdx - chordLocation.startIdx;
  }
  if (isMostlyNonChordsTextLine(chordLocations, text, minIdx, maxIdx)) {
    return [];
  }
  return chordLocations;
}

/** Returns 'true' if the line looks like a normal (non-cords) line. */
export function isMostlyNonChordsTextLine(chordLocations: ChordLocation[], text: string, startIdx: number, endIdx: number): boolean {
  if (chordLocations.length === 0) {
    return true;
  }
  if (chordLocations.length >= 3) { // 3 chords in the line - mark this line as a chords line.
    return false;
  }
  let alphaLen = 0;
  for (let i = startIdx; i < endIdx; i++) {
    const c = text.charAt(i);
    if (isAlpha(c)) {
      alphaLen++;
    }
  }
  let nonChordsAlphaLen = 0;
  for (let i = -1; i < chordLocations.length; i++) {
    const from = i === -1 ? startIdx : chordLocations[i].endIdx;
    const to = i + 1 < chordLocations.length ? chordLocations[i + 1].startIdx : endIdx;
    for (let j = from; j < to; j++) {
      const c = text.charAt(j);
      if (isAlpha(c)) {
        nonChordsAlphaLen++;
      }
    }
  }
  // Return 'true' if % of alpha chars outside of chords is too large.
  return nonChordsAlphaLen >= alphaLen * 2 / 3;
}

/** Returns 'true' if the line looks like tabs: A|--1-2-3--x- */
export function isTabsLine(text: string, startIdx: number, endIdx: number): boolean {
  let tabCharsCount = 0;
  for (let idx = startIdx; idx < endIdx; idx++) {
    const c = text.charAt(idx);
    if (c === '-' || c === '|') {
      tabCharsCount++;
    }
  }
  const textLen = endIdx - startIdx;
  return tabCharsCount >= textLen / 2;
}

/** All possible chord letters (including H). */
const EXTENDED_CHORD_LETTERS: string[] = CHORD_TONES.map(t => t.length === 1 ? t : undefined).filter(isDefined);
EXTENDED_CHORD_LETTERS.push('H');

/** Parses 1 chord starting from startIdx (inclusive) and ending before endIdx (exclusive). */
export function parseChord(text?: string, startIdx?: number, endIdx?: number): ChordLocation|undefined {
  if (!text) {
    return undefined;
  }
  let idx = startIdx === undefined ? 0 : startIdx;
  const tone = readNextCharAsTone(text, idx);
  if (tone === undefined) {
    return undefined;
  }
  const chord: Chord = {tone, type: 'maj', bassTone: undefined};
  let parsedType: ChordType|undefined = undefined;
  idx += tone.length;
  const maxIdx = Math.min(text.length, endIdx === undefined ? text.length : endIdx);

  // Loop until inside of the chord. Skip parts in brackets.
  while (idx < maxIdx) {
    const c = text.charAt(idx);
    if (parsedType === undefined) {
      if (isKnownChordTypeAndTextConflict(c, text, idx)) {
        return undefined;
      }
      const typesByFirstChar = RAW_CHORD_TYPES_BY_FIRST_CHAR.get(c);
      if (typesByFirstChar !== undefined) {
        const rawType = findPrefixToken(text, idx, typesByFirstChar);
        if (rawType !== undefined) {
          idx += rawType.length;
          chord.type = CHORD_TYPE_BY_RAW_NAME.get(rawType)!;
          parsedType = chord.type;
          continue;
        }
      }
    }

    // Parse bass suffix string if any.
    if (idx + 1 < maxIdx && c === CHORD_BASS_SEPARATOR) {
      const bassTone = readNextCharAsTone(text, idx + 1);
      if (bassTone !== undefined) {
        // Check if the next char is a terminator (end of text or whitespace).
        if (idx + bassTone.length + 1 == maxIdx || isWhitespaceOrChordExtender(text.charAt(idx + bassTone.length + 1))) {
          chord.bassTone = bassTone as ChordTone;
          idx += bassTone.length + 1;
          break;
        }
      }
    }

    if (isWordChar(c)) { // the word continues with some letters -> most probably this is not a chord but an ordinary word.
      return undefined;
    }
    break;
  }
  const suffixLenInBracesAfterChord = skipTextInBracesAfterChord(text, idx, 4);
  return {chord, startIdx: startIdx === undefined ? 0 : startIdx, endIdx: idx + suffixLenInBracesAfterChord};
}

function readNextCharAsTone(text: string, idx: number): ChordTone|undefined {
  const c0 = text.charAt(idx);
  let tone = EXTENDED_CHORD_LETTERS.find(c => c === c0);

  if (tone === undefined) {
    return undefined;
  }
  if (tone === 'H') {
    tone = 'B';
  }
  if (idx + 1 === text.length) {
    return tone as ChordTone;
  }
  const toneSuffix = text.charAt(idx + 1);
  if (toneSuffix === '#' || toneSuffix == '♯' || toneSuffix === 'b' || toneSuffix === '♭') {
    tone += toneSuffix === 'b' || toneSuffix === '♭' ? 'b' : '#';
  }
  return tone as ChordTone;

}

function findPrefixToken(text: string, idx: number, tokens: readonly string[]): string|undefined {
  for (const token of tokens) {
    if (text.startsWith(token, idx)) {
      return token;
    }
  }
  return undefined;
}

/** Returns true if the char at the given position is a text start. Chord parsing must start in this case. */
function isKnownChordTypeAndTextConflict(c: string, text: string, idx: number): boolean {
  return (c === '-' || c === '−') && (idx < text.length - 1 && !isWhitespaceOrChordExtender(text.charAt(idx + 1)));
}

/** Return true if a chord in any form can have this character as the last. */
function isWhitespaceOrChordExtender(c: string): boolean {
  return c === ' ' || c === '\n' || c === CHORD_BASS_SEPARATOR || c === '(';
}

/**
 * Returns number of symbols + 2 (for braces) in braces if text starts with opening brace '(' and has a closing brace: ')'.
 * Returns 0 if no braces found or if closing brace is not within maxLenInBraces.
 */

function skipTextInBracesAfterChord(text: string, idx: number, maxLenInBraces: number): number {
  if (text.charAt(idx) !== '(') {
    return 0;
  }
  let len = 1;
  for (const max = Math.min(idx + 2 + maxLenInBraces, text.length); idx + len < max; len++) {
    if (text.charAt(idx + len) === ')') {
      return len + 1;
    }
  }
  return 0;
}

