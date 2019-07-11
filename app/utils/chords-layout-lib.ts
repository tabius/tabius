import {Chord, NEXT_TONE_LETTER_MAP} from '@app/utils/chords-parser-lib';

export interface ChordLayout {
  chord: Chord,
  positions: string,
  fingers: string
}

// noinspection SpellCheckingInspection

/** The chord name is a tone + type (Chord Type) */
export const CHORDS_LAYOUTS: { readonly [chord: string]: string } = withFlatsFromSharps({

  // Major
  'Amaj': 'x02220&f=--123-',
  'A#maj': 'x13331&f=112341',
  'Bmaj': 'x24442&f=112341',
  'Cmaj': 'x32010&f=-32-1-',
  'C#maj': 'x43121&f=112341',
  'Dmaj': 'xx0232&f=---132',
  'D#maj': 'xx1343',
  'Emaj': '022100&f=-231--',
  'Fmaj': '133211&f=134211',
  'F#maj': '244322&f=134211',
  'Gmaj': '320003&f=12--34',
  'G#maj': '466544&f=134211',

  // Minor
  'Amin': 'x02210&f=--231-',
  'A#min': 'x13321&f=113421',
  'Bmin': 'x24432&f=113421',
  'Cmin': 'x35543&f=113421',
  'C#min': 'x46654&f=113421',
  'Dmin': 'xx0231&f=---231',
  'D#min': 'x68876',
  'Emin': '022000&f=-23---',
  'Fmin': '133111&f=134111',
  'F#min': '244222&f=134111',
  'Gmin': '355333&f=134111',
  'G#min': '466444&f=134111',

  // Diminished
  'Adim': 'x0121x',
  'A#dim': 'x12320',
  'Bdim': 'x2343x',
  'Cdim': 'x3454x',
  'C#dim': 'x4565x',
  'Ddim': 'xx0131',
  'D#dim': 'xx1242',
  'Edim': '0120xx',
  'Fdim': '12310x',
  'F#dim': '2342xx',
  'Gdim': '3453xx',
  'G#dim': '4564xx',

  // Augmented
  'Aaug': 'x03221',
  'A#aug': 'x10332',
  'Baug': 'x21003&f=-21--4',
  'Caug': 'x32110&f=-4312-',
  'C#aug': 'x43225',
  'Daug': 'xx0332&f=---231',
  'D#aug': 'xx1003',
  'Eaug': '032110&f=-4312-',
  'Faug': 'xx3221&f=--4231',
  'F#aug': 'xx4332',
  'Gaug': '321003&f=321--4',
  'G#aug': '43211x',

  // Suspended 2nd
  'Asus2': 'x02200',
  'A#sus2': 'x13311',
  'Bsus2': 'x24422',
  'Csus2': 'x30033',
  'C#sus2': 'x46644',
  'Dsus2': 'xx0230',
  'D#sus2': 'xx1341',
  'Esus2': 'xx2452',
  'Fsus2': 'xx3011',
  'F#sus2': 'xx4122',
  'Gsus2': '300033',
  'G#sus2': '411144',

  // Suspended 4th
  'Asus4': 'x00230',
  'A#sus4': 'x11341',
  'Bsus4': 'x22452',
  'Csus4': 'x33011',
  'C#sus4': 'x44122',
  'Dsus4': 'xx0233',
  'D#sus4': 'xx1344',
  'Esus4': '002200',
  'Fsus4': '113311',
  'F#sus4': '224422',
  'Gsus4': '330033',
  'G#sus4': '446644',

  // 5th, Power chords
  'A5': 'x022xx&f=--11--',
  'A#5': 'x133xx&f=--11--',
  'B5': 'x244xx&f=-134--',
  'C5': 'x355xx&f=-134--',
  'C#5': 'x466xx',
  'D5': 'xx023x',
  'D#5': 'xx134x',
  'E5': '022xxx&f=-11---',
  'F5': '133xxx&f=134---',
  'F#5': '244xxx',
  'G5': 'xxx033',
  'G#5': 'xxx144',

  // Major 6th
  'Amaj6': 'x02222',
  'A#maj6': 'x13333',
  'Bmaj6': 'x24444',
  'Cmaj6': 'x35555',
  'C#maj6': 'x46666',
  'Dmaj6': 'xx0202',
  'D#maj6': 'xx1013',
  'Emaj6': '022120',
  'Fmaj6': '100211',
  'F#maj6': '21132x',
  'Gmaj6': '320000',
  'G#maj6': '431111',

  // Minor 6th
  'Amin6': 'x02212',
  'A#min6': 'x13021',
  'Bmin6': 'x20102',
  'Cmin6': 'x31213',
  'C#min6': 'x42324',
  'Dmin6': 'xx0201',
  'D#min6': 'xx1312',
  'Emin6': '022020',
  'Fmin6': '133131',
  'F#min6': '20122x',
  'Gmin6': '310030',
  'G#min6': 'xxx101',

  // Dominant 7th
  'Adom7': 'x02020',
  'A#dom7': 'x13131',
  'Bdom7': 'x21202',
  'Cdom7': 'x32310',
  'C#dom7': 'x46464',
  'Ddom7': 'xx0212',
  'D#dom7': 'xx1023',
  'Edom7': '020100',
  'Fdom7': '131211&f=131211',
  'F#dom7': '242322',
  'Gdom7': '320001',
  'G#dom7': '464544',

  // Major 7th
  'Amaj7': 'x02120',
  'A#maj7': 'x13231',
  'Bmaj7': 'x24342',
  'Cmaj7': 'x32000',
  'C#maj7': 'x43111',
  'Dmaj7': 'xx0222',
  'D#maj7': 'xx1333',
  'Emaj7': '021100',
  'Fmaj7': '132211',
  'F#maj7': '243322',
  'Gmaj7': '354433',
  'G#maj7': '465544',

  // Minor 7th
  'Amin7': 'x02010',
  'A#min7': 'x13121',
  'Bmin7': 'x20202',
  'Cmin7': 'x35343',
  'C#min7': 'x46454',
  'Dmin7': 'xx0211',
  'D#min7': 'xx1322',
  'Emin7': '020000',
  'Fmin7': '131111',
  'F#min7': '202220',
  'Gmin7': '353333',
  'G#min7': 'xxx102',

  // Diminished 7th
  'Adim7': 'x01212',
  'A#dim7': 'x12020',
  'Bdim7': 'x20101',
  'Cdim7': 'x34242',
  'C#dim7': 'x45353',
  'Ddim7': 'xx0101',
  'D#dim7': 'xx1212',
  'Edim7': '012020',
  'Fdim7': '123131',
  'F#dim7': '201212',
  'Gdim7': '312020',
  'G#dim7': '456464',

  // Augmented 7th
  'Aaug7': 'x03021',
  'A#aug7': 'x10132',
  'Baug7': 'x21203',
  'Caug7': 'x36354',
  'C#aug7': 'x47465',
  'Daug7': 'xx0312',
  'D#aug7': 'xx1423',
  'Eaug7': '030110',
  'Faug7': '101221',
  'F#aug7': '210330',
  'Gaug7': '321001',
  'G#aug7': '141221',

  // 9th
  'Adom9': 'x02423&f=x01312',
  'A#dom9': 'x1011x',
  'Bdom9': 'x2122x',
  'Cdom9': 'x32330',
  'C#dom9': 'x4344x',
  'Ddom9': 'xx0210',
  'D#dom9': 'x6566x',
  'Edom9': '020102',
  'Fdom9': '131213',
  'F#dom9': '242324',
  'Gdom9': '353435',
  'G#dom9': '464546',

  // Template:
  // 'A': '&f=',
  // 'A#': '&f=',
  // 'B': '&f=',
  // 'C': '&f=',
  // 'C#': '&f=',
  // 'D': '&f=',
  // 'D#': '&f=',
  // 'E': '&f=',
  // 'F': '&f=',
  // 'F#': '&f=',
  // 'G': '&f=',
  // 'G#': '&f=',
});

type StringMap = { [chord: string]: string };

/** Adds flats to the existing mapping using sharps mappings. */
function withFlatsFromSharps(chordsMap: StringMap): StringMap {
  const res: StringMap = {};
  for (const name in chordsMap) {
    const layout = chordsMap[name];
    res[name] = layout;
    if (name.length >= 2 && name.charAt(1) == '#') {
      const bKey = `${NEXT_TONE_LETTER_MAP[name.charAt(0)]}b${name.substring(2)}`;
      res[bKey] = layout;
    }
  }
  return res;
}

/** Returns chord layout for the given chord. */
export function getChordLayout(chord: Chord): ChordLayout|undefined {
  const key = (chord.tone === 'H' ? 'B' : chord.tone) + chord.type;
  const res = CHORDS_LAYOUTS[key];
  if (!res) {
    return undefined;
  }
  const tokens = res.split('&');
  return {
    chord: chord,
    positions: tokens[0],
    fingers: tokens.length > 1 && tokens[1] ? tokens[1] : ''
  };
}
