export interface Chord {
  tone: string; //todo: make tones type safe
  type: ChordType;
}

export interface ChordLocation {
  chord: Chord;
  startIdx: number;
  endIdx: number; // exclusive
}

export const CHORD_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export type ChordType = '+7B9'|'+7x9'|'+M7B9'|'+M7x9'|'add11'|'2'|'5'|'6/9'
    |'7/6'|'7/9'|'7B5b9'|'7B9'|'7sus2'|'7sus24'|'7sus4'|'7susB13'|'7x11'|'7x9'|'7x9x11'|'9sus4'
    |'aug'|'aug7'|'aug9'|'augmaj7'|'augmaj9'|'B5'
    |'dim'|'dim7'|'dim9'|'dimB9'|'dom'|'dom11'|'dom13'|'dom7dim5'|'dom9'|'half_diminished9'|'half_diminishedB9'
    |'m11B5b9'|'m11B9'|'m2'|'m7B9'|'M7B9'|'M7x11'|'m7x11'|'m7x9'|'M7x9'|'M9x11'
    |'maj'|'maj11'|'maj13'|'maj6'|'maj7'|'maj7sus2'|'maj7sus24'|'maj7sus4'|'maj9'
    |'min'|'min11'|'min13'|'min6'|'min7'|'min7dim5'|'min9'|'minmaj11'|'minmaj13'|'minmaj7'|'minmaj9'|'mM7B5'|'mM7B9'|'Mx11'|'o7B9'
    |'sus2'|'sus24'|'sus2B5'|'sus4';

// noinspection SpellCheckingInspection
/**
 * List of all known by the app chords.
 * Key => system chord name.
 * Value => comma separated chords prefixed by 'A' (for readability).
 *
 * The first token in the value used for visual chord representation (rendering).
 * Note: chords-layout-lib.ts depends on the rendered (visual) chord name!
 */
export const CHORDS_LIB: { readonly [key in ChordType]: string } = {
  '+7B9': 'A+7b9, A7+5b9',
  '+7x9': 'A+7x9, A+7+9, A7+5+9',
  '+M7B9': 'A+M7b9, A+Mb9, AM7+5b9, AM+5b9',
  '+M7x9': 'A+M7+9, A+M+9, AM7+5+9, AM+5+9',
  '2': 'Aadd9, Aadd2, A2',
  '5': 'A5',
  '6/9': 'A6/9, A6_9, AM6/9',
  '7/6': 'A7/6, A7_6',
  '7/9': 'A7/9',
  '7B5b9': 'A7b5b9',
  '7B9': 'A7-9, A7b9',
  '7sus2': 'A7sus2',
  '7sus24': 'A7sus24',
  '7sus4': 'A7sus4, A7sus',
  '7susB13': 'A7susb13, A7suso13',
  '7x11': 'A7+11',
  '7x9': 'A7+9',
  '7x9x11': 'A7+9+11',
  '9sus4': 'A9sus4',
  'add11': 'Aadd11',
  'aug': 'A+, Am#5, Am+5, Aaug, AAugmented',
  'aug7': 'A+7, A7+5, Aaug7, A7#5, A7/5#, A7/5+, A75#, A75+',
  'aug9': 'A+9, A9#5, Aaug9',
  'augmaj7': 'A+M7, A+M, AM7+5, AM+5, Aaugmaj7',
  'augmaj9': 'A+M9, Aaugmaj9',
  'B5': 'Ab5, AMb5, AM-5',
  'dim': 'Adim, Ao, Amb5, Amo5, ADiminished',
  'dim7': 'Adim7, Ao7',
  'dim9': 'Adim9, Ao9',
  'dimB9': 'Adimb9, Aob9',
  'dom': 'A7, Adom, Adom7',
  'dom11': 'A11, Adom11',
  'dom13': 'A13, Adom13',
  'dom7dim5': 'A7b5, Adom7dim5',
  'dom9': 'A9, Adom9',
  'half_diminished9': 'AØ9',
  'half_diminishedB9': 'AØb9',
  'm11B5b9': 'Am11b5b9, Am11o5b9',
  'm11B9': 'Am11b9',
  'm2': 'Am2, Amadd2, Amadd9',
  'm7B9': 'Am7b9',
  'M7B9': 'AM7b9, AMa7b9, AMb9',
  'M7x11': 'AM7+11',
  'm7x11': 'Am7+11',
  'm7x9': 'Am7+9',
  'M7x9': 'AM7+9, AMa7+9, AM+9',
  'M9x11': 'AM9+11, A9+11',
  'maj': 'A, AM, Amaj, AMajor, Amajor', // major
  'maj11': 'AM11, Amaj11',
  'maj13': 'AM13, Amaj13',
  'maj6': 'A6, AM6, Amaj6',
  'maj7': 'AM7, AMa7, Amaj7',
  'maj7sus2': 'AM7sus2, AMa7sus2, Aj7sus2, AMsus2, Amaj7sus2, Amajor7sus2',
  'maj7sus24': 'AM7sus24, AMa7sus24, Aj7sus24, AMsus24, Amaj7sus24, Amajor7sus24',
  'maj7sus4': 'AM7sus4, AMa7sus4, Aj7sus4, AMsus4, Amaj7sus4, Amajor7sus4',
  'maj9': 'AM9, Amaj9',
  'min': 'Am, Amin, AMinor, Aminor', // minor
  'min11': 'Am11, Amin11',
  'min13': 'Am13, Amin13',
  'min6': 'Am6, Amin6',
  'min7': 'Am7, Amin7',
  'min7dim5': 'Am7dim5, Am7b5, AØ, AØ7, Am7o5, Amin7dim5, Am7-5, Am7/5-, Am75-, Am75b, Am+75',
  'min9': 'Am9, Amin9',
  'minmaj11': 'AmM11, Aminmaj11',
  'minmaj13': 'AmM13, Aminmaj13',
  'minmaj7': 'Am+7, Am7+, AmM, AmM7, Am#7, Aminmaj7, Am/maj7, Amin/maj7, Ammaj7',
  'minmaj9': 'AmM9, Aminmaj9',
  'mM7B5': 'AmM7b5',
  'mM7B9': 'AmM7b9, Am#7b9',
  'Mx11': 'AM+11',
  'o7B9': 'Ao7b9',
  'sus2': 'Asus2',
  'sus24': 'Asus24, Asus42',
  'sus2B5': 'Asus2b5, A2-5, Asus2-5',
  'sus4': 'Asus4, Asus, A4, Aadd4',
};

/** List of chord types by 1st char: s => [sus2,sus24,sus2B5...]. */
export const RAW_CHORD_TYPES_BY_FIRST_CHAR = new Map<string, string[]>();

/** System chord name by raw name: 'minor' => 'min', '-' => min, 'm' => 'min' */
export const CHORD_TYPE_BY_RAW_TYPE = new Map<string, ChordType>();

/** Visual type by chord type: first element in the list by key in CHORDS_LIB. */
export const VISUAL_TYPE_BY_CHORD_TYPE = new Map<ChordType, string>();

for (const [key, value] of Object.entries(CHORDS_LIB)) {
  const rawTypes = value.split(',').map(v => v.trim().substring(1));
  if (!rawTypes.includes(key)) {
    rawTypes.push(key);
  }

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
  if (originalVariant.includes('+')) {
    derivedVariants.push(originalVariant.replace('+', '♯'));
  }
  if (originalVariant.includes('Ø')) {
    derivedVariants.push(originalVariant.replace('Ø', 'ø'));
  }
  if (originalVariant.includes('M')) {
    derivedVariants.push(originalVariant.replace('M', 'Δ'));
  }

  const allVariants: string[] = [...derivedVariants, ...[originalVariant]];
  for (const variant of allVariants) {
    if (variant.startsWith('m')) {
      derivedVariants.push(`−${variant.substring(1)}`);
      derivedVariants.push(`-${variant.substring(1)}`);
    }
  }
  return derivedVariants;
}


function registerChordTypeByRawType(chordType: ChordType, rawType: string): void {
  if (CHORD_TYPE_BY_RAW_TYPE.has(rawType)) {
    throw `Duplicate chord mapping: A${rawType} => ${chordType}`;
  }
  CHORD_TYPE_BY_RAW_TYPE.set(rawType, chordType);
}

