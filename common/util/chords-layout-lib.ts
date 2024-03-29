import { isDigit } from '@common/util/misc-utils';
import { Chord, ChordTone } from '@common/util/chords-lib';

export interface ChordLayout {
  chord: Chord;
  positions: string;
  fingers: string;
}

export const NEXT_TONE_LETTER_MAP: { readonly [key: string]: ChordTone } = {
  A: 'B',
  B: 'C',
  C: 'D',
  D: 'E',
  E: 'F',
  F: 'G',
  G: 'A',
};

// noinspection SpellCheckingInspection

/** The chord name is a tone + type (Chord Type) */
export const CHORDS_LAYOUTS: { readonly [chord: string]: string } = withFlatsFromSharps(
  withAutoAssignedFingers({
    // Major
    Amaj: 'x02220&f=--123-',
    'A#maj': 'x13331&f=112341',
    Bmaj: 'x24442&f=112341',
    Cmaj: 'x32010&f=-32-1-',
    'C#maj': 'x43121&f=112341',
    Dmaj: 'xx0232&f=---132',
    'D#maj': 'xx1343',
    Emaj: '022100&f=-231--',
    Fmaj: '133211&f=134211',
    'F#maj': '244322&f=134211',
    Gmaj: '320003&f=12--34',
    'G#maj': '466544&f=134211',

    // Minor
    Amin: 'x02210&f=--231-',
    'A#min': 'x13321&f=113421',
    Bmin: 'x24432&f=113421',
    Cmin: 'x35543&f=113421',
    'C#min': 'x46654&f=113421',
    Dmin: 'xx0231&f=---231',
    'D#min': 'x68876',
    Emin: '022000&f=-23---',
    Fmin: '133111&f=134111',
    'F#min': '244222&f=134111',
    Gmin: '355333&f=134111',
    'G#min': '466444&f=134111',

    // Diminished
    Adim: 'x0121x',
    'A#dim': 'x12320',
    Bdim: 'x2343x',
    Cdim: 'x3454x',
    'C#dim': 'x4565x',
    Ddim: 'xx0131',
    'D#dim': 'xx1242',
    Edim: '0120xx',
    Fdim: '12310x',
    'F#dim': '2342xx',
    Gdim: '3453xx',
    'G#dim': '4564xx',

    // Augmented
    Aaug: 'x03221',
    'A#aug': 'x10332',
    Baug: 'x21003&f=-21--4',
    Caug: 'x32110&f=-4312-',
    'C#aug': 'x43225',
    Daug: 'xx0332&f=---231',
    'D#aug': 'xx1003',
    Eaug: '032110&f=-4312-',
    Faug: 'xx3221&f=--4231',
    'F#aug': 'xx4332',
    Gaug: '321003&f=321--4',
    'G#aug': '43211x',

    // 5th, Power chord
    A5: 'x022xx&f=--11--',
    'A#5': 'x133xx&f=--11--',
    B5: 'x244xx&f=-134--',
    C5: 'x355xx&f=-134--',
    'C#5': 'x466xx',
    D5: 'xx023x',
    'D#5': 'xx134x',
    E5: '022xxx&f=-11---',
    F5: '133xxx&f=134---',
    'F#5': '244xxx',
    G5: 'xxx033',
    'G#5': 'xxx144',

    // Major 6th
    Amaj6: 'x02222',
    'A#maj6': 'x13333',
    Bmaj6: 'x24444',
    Cmaj6: 'x32210',
    'C#maj6': 'x46666',
    Dmaj6: 'xx0202',
    'D#maj6': 'xx1013',
    Emaj6: '022120',
    Fmaj6: '100211',
    'F#maj6': '21132x',
    Gmaj6: '320000',
    'G#maj6': '431111',

    // Minor 6th
    Amin6: 'x02212',
    'A#min6': 'x13023',
    Bmin6: 'x20102',
    Cmin6: 'x31213',
    'C#min6': 'x42324',
    Dmin6: 'xx0201',
    'D#min6': 'xx1312',
    Emin6: '022020',
    Fmin6: '133131',
    'F#min6': '244242',
    Gmin6: '355353',
    'G#min6': '466464',

    // 7th, Dominant 7th
    Adom7: 'x02020',
    'A#dom7': 'x13131',
    Bdom7: 'x21202',
    Cdom7: 'x32310',
    'C#dom7': 'x46464',
    Ddom7: 'xx0212',
    'D#dom7': 'xx1023',
    Edom7: '020100',
    Fdom7: '131211&f=131211',
    'F#dom7': '242322',
    Gdom7: '320001',
    'G#dom7': '464544',

    // Major 7th
    Amaj7: 'x02120',
    'A#maj7': 'x13231',
    Bmaj7: 'x24342',
    Cmaj7: 'x32000',
    'C#maj7': 'x43111',
    Dmaj7: 'xx0222',
    'D#maj7': 'xx1333',
    Emaj7: '021100',
    Fmaj7: '132211',
    'F#maj7': '243322',
    Gmaj7: '354433',
    'G#maj7': '465544',

    // Minor 7th
    Amin7: 'x02010',
    'A#min7': 'x13121',
    Bmin7: 'x24232',
    Cmin7: 'x35343',
    'C#min7': 'x46454',
    Dmin7: 'xx0211',
    'D#min7': 'xx1322',
    Emin7: '020030',
    Fmin7: '131141',
    'F#min7': '242252',
    Gmin7: '353363',
    'G#min7': '464474',

    // Minor Major 7th
    Aminmaj7: 'x02110',
    'A#minmaj7': 'x13221',
    Bminmaj7: 'x24332',
    Cminmaj7: 'x31003',
    'C#minmaj7': 'x42114',
    Dminmaj7: 'xx0221',
    'D#minmaj7': 'xx1332',
    Eminmaj7: '021000',
    Fminmaj7: '132111',
    'F#minmaj7': '243222',
    Gminmaj7: '354333',
    'G#minmaj7': '465444',

    // Diminished 7th
    Adim7: 'x01212',
    'A#dim7': 'x12020',
    Bdim7: 'x20101',
    Cdim7: 'x34242',
    'C#dim7': 'x45353',
    Ddim7: 'xx0101',
    'D#dim7': 'xx1212',
    Edim7: '012020',
    Fdim7: '123131',
    'F#dim7': '234242',
    Gdim7: '345353',
    'G#dim7': '456464',

    // Augmented 7th
    Aaug7: 'x03020',
    'A#aug7': 'x14131',
    Baug7: 'x21203',
    Caug7: 'xx6556',
    'C#aug7': 'xx7667',
    Daug7: 'xx0312',
    'D#aug7': 'xx1423',
    Eaug7: 'xx0110',
    Faug7: 'xx1221',
    'F#aug7': 'xx2332',
    Gaug7: 'xx1001',
    'G#aug7': 'xx2112',

    // Minor 7th Flat 5th
    Amin7dim5: 'x01013', // or 'x01213',
    'A#min7dim5': 'x12120',
    Bmin7dim5: 'x20201',
    Cmin7dim5: 'x31312',
    'C#min7dim5': 'x42423',
    Dmin7dim5: 'xx0111',
    'D#min7dim5': 'xx1222',
    Emin7dim5: '010333',
    Fmin7dim5: '12110x',
    'F#min7dim5': '202210',
    Gmin7dim5: '343363',
    'G#min7dim5': '454474',

    // 9th, Dominant 9th
    Adom9: 'x05600',
    'A#dom9': 'x10111',
    Bdom9: 'x2122x',
    Cdom9: 'x32330',
    'C#dom9': 'x4344x',
    Ddom9: 'x54550',
    'D#dom9': 'x6566x',
    Edom9: '020102',
    Fdom9: '131213',
    'F#dom9': '242324',
    Gdom9: '300201',
    'G#dom9': '464546',

    //  Major 9th
    Amaj9: '546454',
    'A#maj9': 'x10211',
    Bmaj9: 'x2132x',
    Cmaj9: 'x3243x',
    'C#maj9': 'x4354x',
    Dmaj9: 'x5465x',
    'D#maj9': 'xx1031',
    Emaj9: '021102',
    Fmaj9: '102010',
    'F#maj9': '213121',
    Gmaj9: '320202',
    'G#maj9': '435343',

    // Major Add 9th
    Aadd9: '54242x',
    'A#add9': 'x10311',
    Badd9: 'x2142x',
    Cadd9: 'x32030',
    'C#add9': 'x43141',
    Dadd9: 'x54252',
    'D#add9': 'x65363',
    Eadd9: '022102',
    Fadd9: '103011',
    'F#add9': 'xx4324',
    Gadd9: '320203',
    'G#add9': '43131x',

    // Diminished 9th
    Adim9: '535443',
    'A#dim9': '646554',
    Bdim9: 'x20221',
    Cdim9: 'x31332',
    'C#dim9': 'x41000',
    Ddim9: 'x52111',
    'D#dim9': 'x63222',
    Edim9: '010032',
    Fdim9: '121004',
    'F#dim9': '202110',
    Gdim9: '303321',
    'G#dim9': '410102',

    // 11th, Dominant 11th
    Adom11: '542233',
    'A#dom11': '653344',
    Bdom11: 'x21200',
    Cdom11: 'x32311',
    'C#dom11': 'x43422',
    Ddom11: 'x54533',
    'D#dom11': 'x65644',
    Edom11: 'x76755',
    Fdom11: '10131x',
    'F#dom11': '212100',
    Gdom11: '320011',
    'G#dom11': '431122',

    // Minor 11th
    Amin11: '535533',
    'A#min11': '646644',
    Bmin11: 'x20200',
    Cmin11: 'x31311',
    'C#min11': 'x42422',
    Dmin11: 'x53533',
    'D#min11': 'x64644',
    Emin11: '022233',
    Fmin11: '131314',
    'F#min11': '202200',
    Gmin11: '313311',
    'G#min11': '464677',

    // Major Add 11th
    Aadd11: '54223x',
    'A#add11': '65334x',
    Badd11: '76445x',
    Cadd11: 'x32011',
    'C#add11': 'x43122',
    Dadd11: 'x54233',
    'D#add11': 'x65344',
    Eadd11: 'x76455',
    Fadd11: '10331x',
    'F#add11': '2144xx',
    Gadd11: '320013',
    'G#add11': '43112x',

    'Aadd11+': 'x01220',
    'A#add11+': 'x12331',
    'Badd11+': 'x23442',
    'Cadd11+': 'x32012',
    'C#add11+': 'x45664',
    'Dadd11+': 'x56775',
    'D#add11+': 'x67886',
    'Eadd11+': '012100',
    'Fadd11+': '123211',
    'F#add11+': '234322',
    'Gadd11+': '345433',
    'G#add11+': '456544',

    // Suspended 2nd
    Asus2: 'x02200',
    'A#sus2': 'x13311',
    Bsus2: 'x24422',
    Csus2: 'x30033',
    'C#sus2': 'x46644',
    Dsus2: 'xx0230',
    'D#sus2': 'xx1341',
    Esus2: 'xx2452',
    Fsus2: 'xx3011',
    'F#sus2': 'xx4122',
    Gsus2: '300033',
    'G#sus2': '411144',

    // Suspended 2nd Suspended 4th
    Asus2sus4: 'x00200',
    'A#sus2sus4': 'x11311',
    Bsus2sus4: 'x22422',
    Csus2sus4: 'x33033',
    'C#sus2sus4': 'x44644',
    Dsus2sus4: 'x55755',
    'D#sus2sus4': 'x66866',
    Esus2sus4: '002202',
    Fsus2sus4: '113313',
    'F#sus2sus4': '224424',
    Gsus2sus4: '33021x',
    'G#sus2sus4': '446646',

    // Suspended 4th
    Asus4: 'x02230',
    'A#sus4': 'x13341',
    Bsus4: 'x24452',
    Csus4: 'x33011',
    'C#sus4': 'x46674',
    Dsus4: 'xx0233',
    'D#sus4': 'xx1344',
    Esus4: '022200',
    Fsus4: '113311',
    'F#sus4': '224422',
    Gsus4: '330013',
    'G#sus4': '466644',

    // 7th Suspended 2nd
    A7sus2: 'x02000',
    'A#7sus2': 'x13111',
    B7sus2: 'x24222',
    C7sus2: 'x30333',
    'C#7sus2': 'x46444',
    D7sus2: 'xx0210',
    'D#7sus2': 'xx1321',
    E7sus2: 'xx2432',
    F7sus2: 'xx3543',
    'F#7sus2': 'xx4654',
    G7sus2: '303033',
    'G#7sus2': 'xx6876',

    // 7th Suspended 4th
    A7sus4: 'x00233',
    'A#7sus4': 'x11344',
    B7sus4: 'x22200',
    C7sus4: 'x33311',
    'C#7sus4': 'x44422',
    D7sus4: 'xx0013',
    'D#7sus4': 'xx1124',
    E7sus4: '020200',
    F7sus4: '131311',
    'F#7sus4': '242422',
    G7sus4: '330011',
    'G#7sus4': '444644',

    // Template:
    // 'A': '',
    // 'A#': '',
    // 'B': '',
    // 'C': '',
    // 'C#': '',
    // 'D': '',
    // 'D#': '',
    // 'E': '',
    // 'F': '',
    // 'F#': '',
    // 'G': '',
    // 'G#': '',
  }),
);

type StringMap = Record<string, string>;

/** Adds barre to the some chords. This changes the rendering. */
function withAutoAssignedFingers(chordsMap: StringMap): StringMap {
  for (const name of Object.keys(chordsMap)) {
    const layout = chordsMap[name];
    if (layout.includes('&')) {
      continue;
    }
    const chars = layout.split('');
    const c0 = chars.find(c => c !== 'x');
    const cN = [...chars].reverse().find(c => c !== 'x');
    if (c0 && c0 === cN && c0.charCodeAt(0) === Math.min(...chars.map(c => c.charCodeAt(0)))) {
      let fingers = '';
      chars.forEach(c => (fingers += c === c0 ? '1' : '-'));
      chordsMap[name] = layout + '&f=' + fingers;
    }
  }
  return chordsMap;
}

/** Adds flats to the existing mapping using sharps mappings. */
function withFlatsFromSharps(chordsMap: StringMap): StringMap {
  const res: StringMap = {};
  for (const name of Object.keys(chordsMap)) {
    const layout = chordsMap[name];
    res[name] = layout;
    if (name.length >= 2 && name.charAt(1) === '#') {
      const bKey = `${NEXT_TONE_LETTER_MAP[name.charAt(0)]}b${name.substring(2)}`;
      res[bKey] = layout;
    }
  }
  return res;
}

interface BassTonePosition {
  /** String number. */
  stringIndex: number;
  /** Fret. */
  fret: number;
}

const BASS_TONE_POSITIONS = initBassTones();

function initBassTones() {
  const map = new Map<string, BassTonePosition[]>();
  map.set('E', [{ stringIndex: 6, fret: 0 }]);
  map.set('F', [
    { stringIndex: 6, fret: 1 },
    { stringIndex: 5, fret: 8 },
  ]);
  map.set('F#', [
    { stringIndex: 6, fret: 2 },
    { stringIndex: 5, fret: 9 },
  ]);
  map.set('Gb', [
    { stringIndex: 6, fret: 2 },
    { stringIndex: 5, fret: 9 },
  ]);
  map.set('G', [
    { stringIndex: 6, fret: 3 },
    { stringIndex: 5, fret: 10 },
  ]);
  map.set('G#', [
    { stringIndex: 6, fret: 4 },
    { stringIndex: 5, fret: 11 },
  ]);
  map.set('Ab', [
    { stringIndex: 6, fret: 4 },
    { stringIndex: 5, fret: 11 },
  ]);
  map.set('A', [
    { stringIndex: 6, fret: 5 },
    { stringIndex: 5, fret: 0 },
  ]);
  map.set('A#', [
    { stringIndex: 6, fret: 6 },
    { stringIndex: 5, fret: 1 },
  ]);
  map.set('Bb', [
    { stringIndex: 6, fret: 6 },
    { stringIndex: 5, fret: 1 },
  ]);
  map.set('B', [
    { stringIndex: 6, fret: 7 },
    { stringIndex: 5, fret: 2 },
  ]);
  map.set('C', [
    { stringIndex: 6, fret: 8 },
    { stringIndex: 5, fret: 3 },
  ]);
  map.set('C#', [
    { stringIndex: 6, fret: 9 },
    { stringIndex: 5, fret: 4 },
  ]);
  map.set('Db', [
    { stringIndex: 6, fret: 9 },
    { stringIndex: 5, fret: 4 },
  ]);
  map.set('D', [
    { stringIndex: 6, fret: 10 },
    { stringIndex: 5, fret: 5 },
  ]);
  return map;
}

/** Applies bass tone to the layout and returns new layout with the bass-tone. */
export function applyBassTone(chordLayout: string, bassTone: string | undefined): string {
  if (!bassTone) {
    return chordLayout;
  }
  const bassPositions = BASS_TONE_POSITIONS.get(bassTone);
  if (!bassPositions || bassPositions.length === 0) {
    return chordLayout;
  }
  let averageChordFret = 0;
  let stringsCount = 0;
  for (let i = 2; i < chordLayout.length; i++) {
    const stringIndexChar = chordLayout.charAt(i);
    if (isDigit(stringIndexChar)) {
      stringsCount++;
      averageChordFret += Number(stringIndexChar);
    }
  }
  if (stringsCount === 0) {
    return chordLayout;
  }
  averageChordFret = averageChordFret / stringsCount;

  const fretDistance = (p: BassTonePosition) => Math.abs(p.fret - averageChordFret);
  const isFirstBassPositionBetter = (position1: BassTonePosition, position2: BassTonePosition) => {
    const distance1 = fretDistance(position1);
    const distance2 = fretDistance(position2);
    return distance1 < distance2 || (distance1 === distance2 && position1.stringIndex === 6);
  };

  let bestPos = bassPositions[0];
  for (let i = 1; i < bassPositions.length; i++) {
    const pos = bassPositions[i];
    bestPos = isFirstBassPositionBetter(pos, bestPos) ? pos : bestPos;
  }
  return bestPos.stringIndex === 5 ? 'x' + bestPos.fret + chordLayout.substring(2) : bestPos.fret + chordLayout.substring(1);
}

/** Returns chord layout for the given chord. */
export function getChordLayout(chord: Chord): ChordLayout | undefined {
  const key = chord.tone + chord.type;
  const layout = CHORDS_LAYOUTS[key];
  if (!layout) {
    return undefined;
  }
  const tokens = layout.split('&');
  return {
    chord: chord,
    positions: applyBassTone(tokens[0], chord.bassTone),
    fingers: tokens.length > 1 && tokens[1] ? tokens[1] : '',
  };
}
