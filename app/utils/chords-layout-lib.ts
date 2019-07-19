import {Chord, ChordTone} from '@app/utils/chords-parser-lib';

export interface ChordLayout {
  chord: Chord,
  positions: string,
  fingers: string
}

export const NEXT_TONE_LETTER_MAP: { readonly [key: string]: ChordTone } = {'A': 'B', 'B': 'C', 'C': 'D', 'D': 'E', 'E': 'F', 'F': 'G', 'G': 'A'};

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

  // 5th, Power chord
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

  // 7th, Dominant 7th
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

  // Minor Major 7th
  'Aminmaj7': 'x02110',
  'A#minmaj7': 'x13221',
  'Bminmaj7': 'x20302',
  'Cminmaj7': 'x31003',
  'C#minmaj7': 'x42114',
  'Dminmaj7': 'xx0221',
  'D#minmaj7': 'xx1332',
  'Eminmaj7': '021000',
  'Fminmaj7': '132111',
  'F#minmaj7': '243222',
  'Gminmaj7': '354333',
  'G#minmaj7': '465444',

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

  // 9th, Dominant 9th
  'Adom9': 'x02423&f=x01312',
  'A#dom9': 'x1011x',
  'Bdom9': 'x2122x',
  'Cdom9': 'x32330',
  'C#dom9': 'x4344x',
  'Ddom9': 'x5455x',
  'D#dom9': 'xx1021',
  'Edom9': '020102',
  'Fdom9': '131213',
  'F#dom9': '242324',
  'Gdom9': '353435',
  'G#dom9': '464546',

  // Major Add 9th
  'Aadd9': '54242x',
  'A#add9': 'x10311',
  'Badd9': 'x2142x',
  'Cadd9': 'x32030',
  'C#add9': 'x43141',
  'Dadd9': 'x54252',
  'D#add9': 'x65363',
  'Eadd9': '022102',
  'Fadd9': '103011',
  'F#add9': 'xx4324',
  'Gadd9': '320203',
  'G#add9': '43131x',

  // Diminished 9th
  'Adim9': '535443',
  'A#dim9': '646554',
  'Bdim9': 'x20221',
  'Cdim9': 'x31332',
  'C#dim9': 'x41000',
  'Ddim9': 'x52111',
  'D#dim9': 'x63222',
  'Edim9': '010032',
  'Fdim9': '121004',
  'F#dim9': '202110',
  'Gdim9': '303321',
  'G#dim9': '410102',

  // 11th, Dominant 11th
  'Adom11': '542233',
  'A#dom11': '653344',
  'Bdom11': 'x21200',
  'Cdom11': 'x32311',
  'C#dom11': 'x43422',
  'Ddom11': 'x54533',
  'D#dom11': 'x65644',
  'Edom11': 'x76755',
  'Fdom11': '10131x',
  'F#dom11': '212100',
  'Gdom11': '320011',
  'G#dom11': '431122',

  // Minor 11th
  'Amin11': '535533',
  'A#min11': '646644',
  'Bmin11': 'x20200',
  'Cmin11': 'x31311',
  'C#min11': 'x42422',
  'Dmin11': 'x53533',
  'D#min11': 'x64644',
  'Emin11': '022233',
  'Fmin11': '131314',
  'F#min11': '202200',
  'Gmin11': '313311',
  'G#min11': '464677',

  // Major Add 11th
  'Aadd11': '54223x',
  'A#add11': '65334x',
  'Badd11': '76445x',
  'Cadd11': 'x32011',
  'C#add11': 'x43122',
  'Dadd11': 'x54233',
  'D#add11': 'x65344',
  'Eadd11': 'x76455',
  'Fadd11': '10331x',
  'F#add11': '2144xx',
  'Gadd11': '320013',
  'G#add11': '43112x',

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

  // Suspended 2nd Suspended 4th
  'Asus2sus4': 'x00200',
  'A#sus2sus4': 'x11311',
  'Bsus2sus4': 'x22422',
  'Csus2sus4': 'x33033',
  'C#sus2sus4': 'x44644',
  'Dsus2sus4': 'x55755',
  'D#sus2sus4': 'x66866',
  'Esus2sus4': '002202',
  'Fsus2sus4': '113313',
  'F#sus2sus4': '224424',
  'Gsus2sus4': '33021x',
  'G#sus2sus4': '446646',

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

  // 7th Suspended 2nd
  'A7sus2': 'x02000',
  'A#7sus2': 'x13111',
  'B7sus2': 'x24222',
  'C7sus2': 'x30333',
  'C#7sus2': 'x46444',
  'D7sus2': 'xx0210',
  'D#7sus2': 'xx1321',
  'E7sus2': 'xx2432',
  'F7sus2': 'xx3543',
  'F#7sus2': 'xx4654',
  'G7sus2': '303033',
  'G#7sus2': 'xx6876',

  // 7th Suspended 4th
  'A7sus4': 'x00233',
  'A#7sus4': 'x11344',
  'B7sus4': 'x22200',
  'C7sus4': 'x33311',
  'C#7sus4': 'x44422',
  'D7sus4': 'xx0013',
  'D#7sus4': 'xx1124',
  'E7sus4': '020200',
  'F7sus4': '131311',
  'F#7sus4': '242422',
  'G7sus4': '330011',
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
  const key = chord.tone + chord.type;
  const layout = CHORDS_LAYOUTS[key];
  if (!layout) {
    return undefined;
  }
  const tokens = layout.split('&');
  return {
    chord: chord,
    positions: tokens[0],
    fingers: tokens.length > 1 && tokens[1] ? tokens[1] : ''
  };
}
