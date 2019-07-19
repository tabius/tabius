import {Chord, CHORD_TONES, CHORD_TYPE_BY_RAW_NAME, ChordLocation, ChordTone, ChordType, RAW_CHORD_TYPES_BY_FIRST_CHAR} from '@app/utils/chords-parser-lib';
import {defined} from '@common/util/misc-utils';

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
      idx++;
      continue;
    }
    chordLocations.push(chordLocation);
    idx += chordLocation.endIdx - chordLocation.startIdx;
  }

  if (chordLocations.length > 0 && !hasChordsNotLikeWords(chordLocations, text)) {
    if ((chordLocations.length > 1 && allChordsAreTheSame(chordLocations)) || !isTheOnlyAlphaInText(chordLocations[0], text, minIdx, maxIdx)) {
      return [];
    }
  }

  // strings-like lines heuristics: A|--1-2-3--x-
  if (chordLocations.length === 1 && chordLocations[0].endIdx - chordLocations[0].startIdx <= 2) { // <=2: A or A- (minor)
    const textWithoutChord = text.substring(minIdx, maxIdx).replace(chordLocations[0].chord.tone, '');
    if (isTabsLikeLine(textWithoutChord)) {
      return [];
    }
  }
  return chordLocations;
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
  if (tone == undefined) {
    return undefined;
  }
  const chord: Chord = {tone: tone == 'H' ? 'B' : tone as ChordTone, type: 'maj'};
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

export function isTabsLikeLine(text: string): boolean {
  let dashCount = 0;
  for (let idx = 0; idx < text.length; idx++) {
    const c = text.charAt(idx);
    if (c === '-') {
      dashCount++;
    }
  }
  return dashCount > text.length / 2;
}


/** Returns true if the char at the given position is a text start. Chord parsing must start in this case. */
function isKnownTypeAndTextConflict(c: string, text: string, idx: number): boolean {
  return (c === '-' || c === '−') && (idx < text.length - 1 && !isWhitespaceOrChordExtender(text.charAt(idx + 1)));
}

/** Return true if a chord in any form can have this character as the last. */
function isWhitespaceOrChordExtender(c: string): boolean {
  return c === ' ' || c === '\n' || c === '/' || c === '(';
}

const CHORDS_LIKE_WORDS_LC = new Set<string>(['a', 'go']);

function hasChordsNotLikeWords(locations: ChordLocation[], text: string): boolean {
  for (const l of locations) {
    const chordText = text.substring(l.startIdx, l.endIdx).toLocaleLowerCase();
    if (!CHORDS_LIKE_WORDS_LC.has(chordText)) {
      return true;
    }
  }
  return false;
}

function allChordsAreTheSame(chordLocations: ChordLocation[]): boolean {
  if (chordLocations.length === 0) {
    return true;
  }
  const chord0 = chordLocations[0];
  for (let i = 1; i < chordLocations.length; i++) {
    const chordI = chordLocations[i];
    if (chord0.chord.tone !== chordI.chord.tone || chord0.chord.type !== chordI.chord.type) {
      return false;
    }
  }
  return true;
}

function isTheOnlyAlphaInText(chordLocation: ChordLocation, text: string, minIdx: number, maxIdx: number): boolean {
  if (chordLocation.startIdx > minIdx && !containsNonAlphaCharsOnly(text.substring(minIdx, chordLocation.startIdx))) {
    return false;
  }
  // noinspection RedundantIfStatementJS
  if (chordLocation.endIdx < maxIdx - 1 && !containsNonAlphaCharsOnly(text.substring(chordLocation.endIdx, maxIdx))) {
    return false;
  }
  return true;
}

export function containsNonAlphaCharsOnly(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (isAlpha(text.charAt(i))) {
      return false;
    }
  }
  return true;
}



