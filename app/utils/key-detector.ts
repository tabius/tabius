import {Chord, ChordTone} from '@app/utils/chords-parser-lib';
import {transpose} from '@app/utils/chords-renderer';

/** All key variations used by tone detector. */
export const KEY_VARIANTS = <const>[['A'], ['A#', 'Bb'], ['B'], ['C'], ['C#', 'Db'], ['D'], ['D#', 'Eb'], ['E'], ['F'], ['F#', 'Gb'], ['G'], ['G#', 'Ab']];

/** Match score per tone. */
interface ChordToneMatch {
  tone: ChordTone;
  score: number
}

/** Key representation used by key-detector algorithm. */
interface KeyPattern {
  key: ChordTone;
  minors: ChordToneMatch[];
  majors: ChordToneMatch[];
}

/** Helper factory function. */
function m(tone: ChordTone, score: number): ChordToneMatch {
  return {tone, score};
}

const KEY_MATCH = 4;
const PARALLEL_MAJOR_MATCH = 3;
const STANDARD_MATCH = 2;
const ALTERNATIVE_HARMONIC_MATCH = 1;

/** Combines both natural (Em) and harmonic (E) scales. */
const AM_PATTERN: KeyPattern = {
  key: 'A',
  majors: [m('C', PARALLEL_MAJOR_MATCH), m('F', STANDARD_MATCH), m('G', STANDARD_MATCH), m('E', ALTERNATIVE_HARMONIC_MATCH)],
  minors: [m('A', KEY_MATCH), m('D', STANDARD_MATCH), m('E', ALTERNATIVE_HARMONIC_MATCH)],
};

/** List of all detectable minor key patterns. */
const ALL_MINOR_PATTERNS: KeyPattern[] = [];

/** Returns true if the tone is flat. */
export function checkToneIsFlat(tone: string): boolean {
  return tone.endsWith('b');
}

for (const keyVariants of KEY_VARIANTS) {
  for (const key of keyVariants) {
    const isFlat = checkToneIsFlat(key);
    const distance = getTransposeDistance('A', key);
    ALL_MINOR_PATTERNS.push({
      key,
      minors: AM_PATTERN.minors.map(({tone, score}) => m(transpose(tone, distance, isFlat), score)),
      majors: AM_PATTERN.majors.map(({tone, score}) => m(transpose(tone, distance, isFlat), score)),
    });
  }
}

/** Returns true if chord type corresponds to major chord. */
function checkIsMajor(type: string): boolean {
  return type === 'maj' || type === 'maj7';   // TODO: improve.
}

/** Returns true if chord type corresponds to minor chord. */
function checkIsMinor(type: string): boolean {
  return type === 'min' || type === 'min7';   // TODO: improve.
}

/** Returns key as ChordTone for the given chords sequence or undefined if chords detection is failed. */
export function detectKeyAsMinor(chords: Chord[]): ChordTone|undefined {
  if (chords.length === 0) {
    return undefined;
  }
  const weightMap = new Map<ChordTone, number>();
  for (const keyPattern of ALL_MINOR_PATTERNS) {
    weightMap.set(keyPattern.key, 0);
  }

  // Assign weight to each key pattern.
  for (const {tone, type} of chords) {
    // TODO: optimize.
    const isMajor = checkIsMajor(type);
    const isMinor = checkIsMinor(type);
    for (const {key, majors, minors} of ALL_MINOR_PATTERNS) {
      let toneWeightPerKey = -1;
      const match = isMajor ? majors.find(m => m.tone === tone) : (isMinor ? minors.find(m => m.tone === tone) : undefined);
      toneWeightPerKey = match ? match.score : -1;
      weightMap.set(key, weightMap.get(key)! + toneWeightPerKey);
    }
  }

  // Return tone with the highest weight.
  let resultTone: ChordTone|undefined = undefined;
  let resultWeight = 0;
  for (const [tone, weight] of weightMap.entries()) {
    if (weight > resultWeight) {
      resultTone = tone;
      resultWeight = weight;
    }
  }
  return resultTone;
}

/** Returns transpose distance (number of semi-tones) between 2 tones. */
export function getTransposeDistance(tone1: ChordTone, tone2: ChordTone): number {
  const index1 = KEY_VARIANTS.findIndex(tones => tones.some(t => t === tone1));
  const index2 = KEY_VARIANTS.findIndex(tones => tones.some(t => t === tone2));
  return index2 - index1;
}
