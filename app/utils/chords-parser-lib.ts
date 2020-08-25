export interface Chord {
  tone: ChordTone;
  type: ChordType;
  bassTone?: ChordTone;
}

export interface ChordLocation {
  chord: Chord;
  startIdx: number;
  endIdx: number; // exclusive
}

export const CHORD_TONES = <const>['A', 'A#', 'Bb', 'B', 'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab'];
export type ChordTone = typeof CHORD_TONES[number];

export type ChordType = '+7B9'|'+7+9'|'+M7B9'|'+M7+9'|'add9'|'add11'|'2'|'5'|'6/9'
    |'7/6'|'7/9'|'7B5b9'|'7B9'|'7sus2'|'7sus24'|'7sus4'|'7susB13'|'7x11'|'7x9'|'7x9x11'|'9sus4'
    |'aug'|'aug7'|'aug9'|'augmaj7'|'augmaj9'|'B5'
    |'dim'|'dim7'|'dim9'|'dimB9'|'dim7B9'|'dom7'|'dom11'|'dom13'|'dom7dim5'|'dom9'|'half_diminished9'|'half_diminishedB9'
    |'m11B5b9'|'m11B9'|'m2'|'m7B9'|'M7B9'|'M7x11'|'m7x11'|'m7x9'|'M7x9'|'M9x11'
    |'maj'|'maj11'|'maj13'|'maj6'|'maj7'|'maj7sus2'|'maj7sus24'|'maj7sus4'|'maj9'
    |'min'|'min11'|'min13'|'min6'|'min7'|'min7dim5'|'min9'|'minmaj11'|'minmaj13'|'minmaj7'|'minmaj9'|'mM7B5'|'mM7B9'|'Mx11'
    |'sus2'|'sus2sus4'|'sus2B5'|'sus4';

// noinspection SpellCheckingInspection
/**
 * List of all known by the app chords.
 * Key => system chord name.
 * Value => comma separated chords prefixed by 'A' (for readability).
 *
 * The first token in the value used for the visual chord representation (rendering).
 */
export const CHORDS_LIB: { readonly [key in ChordType]: string } = {
  '+7+9': 'A+7+9, A7+5+9',
  '+7B9': 'A+7b9, A7+5b9',
  '+M7+9': 'A+M7+9, A+M+9, AM7+5+9, AM+5+9',
  '+M7B9': 'A+M7b9, A+Mb9, AM7+5b9, AM+5b9',
  '2': 'A2, Aadd2',
  '5': 'A5', // 5th, Power chord
  '6/9': 'A6/9, AM6/9',
  '7/6': 'A7/6, AM7/6',
  '7/9': 'A7/9, AM7/9',
  '7B5b9': 'A7b5b9',
  '7B9': 'A7-9, A7b9',
  '7sus2': 'A7sus2', // 7th Suspended 2nd
  '7sus24': 'A7sus24',
  '7sus4': 'A7sus4, A7sus', // 7th Suspended 4th
  '7susB13': 'A7susb13',
  '7x11': 'A7+11',
  '7x9': 'A7+9',
  '7x9x11': 'A7+9+11',
  '9sus4': 'A9sus4',
  'add11': 'Aadd11', // Major Add 11th
  'add9': 'Aadd9', // Major Add 9th
  'aug': 'A+, A+5, Am+5, Aaug, AAugmented', // Augmented
  'aug7': 'A+7, A7+5, Aaug7', // Augmented 7th
  'aug9': 'A+9, A9#5, Aaug9',
  'augmaj7': 'A+M7, A+M, AM7+5, AM+5, AaugM7',
  'augmaj9': 'A+M9, AaugM9',
  'B5': 'Ab5, AMb5, AM-5',
  'dim': 'Adim, Amb5, Amo5, Am5-, ADiminished', // Diminished: [root, m3, d5]
  'dim7': 'Adim7', // Diminished 7th: [root, m3, d5, d7]
  'dim7B9': 'Adim7b9',
  'dim9': 'Adim9, Adim7/9, Adim7add2, Adim7add9, Am7b5add2', // Diminished 9th
  'dimB9': 'Adimb9',
  'dom11': 'A11, Adom11', // 11th, Dominant 11th
  'dom13': 'A13, Adom13',
  'dom7': 'A7, Adom, Adom7', // 7th, Dominant 7th
  'dom7dim5': 'A7b5, Adom7dim5',
  'dom9': 'A9, Adom9', // 9th, Dominant 9th
  'half_diminished9': 'AØ9',
  'half_diminishedB9': 'AØb9',
  'm11B5b9': 'Am11b5b9, Am11o5b9',
  'm11B9': 'Am11b9',
  'm2': 'Am2, Amadd2, Amadd9',
  'm7B9': 'Am7b9',
  'M7B9': 'AM7b9, AMb9',
  'M7x11': 'AM7+11',
  'm7x11': 'Am7+11',
  'm7x9': 'Am7+9',
  'M7x9': 'AM7+9, AM+9',
  'M9x11': 'A9+11, AM9+11',
  'maj': 'A, AM', // Major
  'maj11': 'AM11',
  'maj13': 'AM13',
  'maj6': 'A6, AM6, Aadd6', // Major 6th
  'maj7': 'AM7', // Major 7th
  'maj7sus2': 'AM7sus2, AMsus2',
  'maj7sus24': 'AM7sus24, AMsus24',
  'maj7sus4': 'AM7sus4, AMsus4',
  'maj9': 'AM9', // Major 9th
  'min': 'Am', // Minor
  'min11': 'Am11', // Minor 11th
  'min13': 'Am13',
  'min6': 'Am6, A6m', // Minor 6th
  'min7': 'Am7', // Minor 7th
  'min7dim5': 'Am7b5, Am7dim5, AØ, AØ7, Am7-5, Am7/5-, Am75-, Am75b, Am7+5', // Minor 7th Flat 5th or half-diminished seventh chord [root, m3, d5, m7]
  'min9': 'Am9',
  'minmaj11': 'AmM11',
  'minmaj13': 'AmM13',
  'minmaj7': 'AmM7, Am7M, Am+7, AmM, Am/M7', // Minor Major 7th
  'minmaj9': 'AmM9',
  'mM7B5': 'AmM7b5',
  'mM7B9': 'AmM7b9, Am#7b9',
  'Mx11': 'AM+11',
  'sus2': 'Asus2, Amsus2', // Suspended 2nd
  'sus2sus4': 'Asus24, Asus42', // Suspended 2nd Suspended 4th
  'sus2B5': 'Asus2b5, A2-5, Asus2-5',
  'sus4': 'Asus4, Asus, A4, Aadd4, Amsus4', // Suspended 4th
};

/** List of chord types by 1st char: s => [sus2,sus24,sus2B5...]. */
export const RAW_CHORD_TYPES_BY_FIRST_CHAR = new Map<string, string[]>();

/** System chord name by raw name: 'minor' => 'min', '-' => min, 'm' => 'min' */
export const CHORD_TYPE_BY_RAW_NAME = new Map<string, ChordType>();

/** Visual type by chord type: first element in the list by key in CHORDS_LIB. */
export const VISUAL_TYPE_BY_CHORD_TYPE = new Map<ChordType, string>();

for (const [key, value] of Object.entries(CHORDS_LIB)) {
  const rawTypes = value.split(',').map(v => v.trim().substring(1));
  const chordType = key as ChordType;
  const visualType = rawTypes[0];
  VISUAL_TYPE_BY_CHORD_TYPE.set(chordType, visualType);

  for (const rawType of rawTypes) {
    registerChordTypeByRawType(chordType, rawType);
    if (rawType.length > 0) {
      const rawTypeVariations: string[] = getRawTypeVariations(rawType);
      addToRawTypesByFirstChar(rawType);
      for (const rawTypeVariation of rawTypeVariations) {
        addToRawTypesByFirstChar(rawTypeVariation);
        registerChordTypeByRawType(chordType, rawTypeVariation);
      }
    }
  }
  for (const byFirstChar of RAW_CHORD_TYPES_BY_FIRST_CHAR.values()) {
    byFirstChar.sort().reverse(); // longest first.
  }
}

function addToRawTypesByFirstChar(rawType): void {
  const firstChar = rawType.charAt(0);
  let byFirstChar = RAW_CHORD_TYPES_BY_FIRST_CHAR.get(firstChar);
  if (!byFirstChar) {
    byFirstChar = [];
    RAW_CHORD_TYPES_BY_FIRST_CHAR.set(firstChar, byFirstChar);
  }
  byFirstChar.push(rawType);
}

function getRawTypeVariations(originalVariant: string): string[] {
  const derivedVariants: string[] = [];

  if (originalVariant.includes('dim')) {
    derivedVariants.push(originalVariant.replace('dim', '°'));
  }

  if (originalVariant.includes('Ø')) {
    derivedVariants.push(originalVariant.replace('Ø', 'ø'));
  }

  if (originalVariant.includes('/')) {
    derivedVariants.push(originalVariant.replace('/', '_'));
  }

  if (originalVariant.includes('M')) {
    derivedVariants.push(originalVariant.replace('M', 'Δ'));
    derivedVariants.push(originalVariant.replace('M', 'maj'));
    derivedVariants.push(originalVariant.replace('M', 'major'));
    derivedVariants.push(originalVariant.replace('M', 'Major'));
  }

  if (originalVariant.includes('M7')) {
    derivedVariants.push(originalVariant.replace('M7', 'Ma7'));
  }

  if (originalVariant.includes('b1')) { // b1 -> ignore case
    derivedVariants.push(originalVariant.replace('b1', 'B1'));
  }

  if (originalVariant.includes('b5')) { // b5 -> ignore case
    derivedVariants.push(originalVariant.replace('b5', 'B5'));
  }

  if (originalVariant.includes('b9')) { // b9 -> ignore case
    derivedVariants.push(originalVariant.replace('b9', 'B9'));
  }

  if (originalVariant.endsWith('+5') || originalVariant.endsWith('+7')) {
    const len = originalVariant.length;
    const d = originalVariant.charAt(len - 1);
    const p = originalVariant.substring(0, len - 2);
    derivedVariants.push(`${p + d}+`);  // Am+5 -> Am5+
    derivedVariants.push(`${p}/${d}+`); // Am+5 -> Am/5+
    derivedVariants.push(`${p + d}#`);  // Am+5 -> Am5#
    derivedVariants.push(`${p}/${d}#`); // Am+5 -> Am/5#
    if (p.length > 1) {
      derivedVariants.push(`${p}#${d}`);  // Am+5 -> Am#5
    }
  }

  const allVariants: string[] = [...derivedVariants, ...[originalVariant]];
  for (const variant of allVariants) {
    if (variant.startsWith('m') && !variant.startsWith('ma')) {
      const suffix = variant.substring(1);
      derivedVariants.push(`min${suffix}`);
      derivedVariants.push(`minor${suffix}`);
      derivedVariants.push(`Minor${suffix}`);
      derivedVariants.push(`−${suffix}`);
      derivedVariants.push(`-${suffix}`);
    }
  }
  for (const variant of allVariants) {
    if (variant.lastIndexOf('+') > 0) {
      derivedVariants.push(variant.charAt(0) + variant.substring(1).replace(/\+/g, 'x'));
    }
  }
  return derivedVariants;
}


function registerChordTypeByRawType(chordType: ChordType, rawType: string): void {
  if (CHORD_TYPE_BY_RAW_NAME.has(rawType)) {
    throw new Error(`Duplicate chord mapping: A${rawType} => ${chordType}`);
  }
  CHORD_TYPE_BY_RAW_NAME.set(rawType, chordType);
}

