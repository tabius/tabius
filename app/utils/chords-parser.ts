import {Chord, CHORD_TONES, CHORD_TYPE_BY_RAW_NAME, ChordLocation, ChordTone, ChordType, RAW_CHORD_TYPES_BY_FIRST_CHAR} from '@app/utils/chords-parser-lib';
import {defined, isAlpha, isDigit} from '@common/util/misc-utils';

function isWordChar(char: string): boolean {
  return isAlpha(char) || char === '’';
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

  let lineText = text;
  if (isTabsLine(text, minIdx, maxIdx)) {
    if (!text.startsWith('-')) {
      return [];
    }
    lineText = text.replace(/-/g, ' ');
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
    const chordLocation = parseChord(lineText, idx, maxIdx);
    if (chordLocation === undefined) {
      idx++;
      continue;
    }
    chordLocations.push(chordLocation);
    idx += chordLocation.endIdx - chordLocation.startIdx;
  }
  if (isMostlyNonChordsTextLine(chordLocations, lineText, minIdx, maxIdx)) {
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
const EXTENDED_CHORD_LETTERS: string[] = CHORD_TONES.map(t => t.length === 1 ? t : undefined).filter(defined);
EXTENDED_CHORD_LETTERS.push('H');

/** Parses 1 chord starting from the startIdx. */
export function parseChord(text?: string, startIdx?: number, endIdx?: number): ChordLocation|undefined {
  if (!text) {
    return undefined;
  }
  let idx = startIdx === undefined ? 0 : startIdx;
  const tone = findPrefixToken(text, idx, EXTENDED_CHORD_LETTERS);
  if (tone === undefined) {
    return undefined;
  }
  const chord: Chord = {tone: tone === 'H' ? 'B' : tone as ChordTone, type: 'maj'};
  let parsedType: ChordType|undefined = undefined;
  idx += tone.length;
  let maxIdx = Math.min(text.length, endIdx === undefined ? text.length : endIdx);
  // loop until inside a chord.
  while (idx < maxIdx) {
    const c = text.charAt(idx);
    if (chord.tone.length === 1 && c === '#' || c === 'b') {
      chord.tone += c;
      idx++;
      continue;
    }
    if (parsedType === undefined) {
      if (isKnownTypeAndTextConflict(c, text, idx)) {
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
    if (isWordChar(c)) { // the word continues with some letters -> most probably this is not a chord but an ordinary word.
      return undefined;
    }
    break;
  }
  const suffixLenInBracesAfterChord = skipTextInBracesAfterChord(text, idx, 4);
  return {chord, startIdx: startIdx === undefined ? 0 : startIdx, endIdx: idx + suffixLenInBracesAfterChord};
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
function isKnownTypeAndTextConflict(c: string, text: string, idx: number): boolean {
  return (c === '-' || c === '−') && (idx < text.length - 1 && !isWhitespaceOrChordExtender(text.charAt(idx + 1)));
}

/** Return true if a chord in any form can have this character as the last. */
function isWhitespaceOrChordExtender(c: string): boolean {
  return c === ' ' || c === '\n' || c === '/' || c === '(';
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

