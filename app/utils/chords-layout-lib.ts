export interface ChordLayout {
  name: string,
  positions: string,
  fingers: string
}

//noinspection SpellCheckingInspection
export const CHORDS_LAYOUTS: { readonly [chord: string]: string } = {

  ///////////// Triads /////////////

  // Major
  'A': 'x02220&f=--123-',
  'A#': 'x13331&f=112341',
  'B': 'x24442&f=112341',
  'C': 'x32010&f=-32-1-',
  'C#': 'x43121&f=112341',
  'D': 'xx0232&f=---132',
  'D#': 'xx1343',
  'E': '022100&f=-231--',
  'F': '133211&f=134211',
  'F#': '244322&f=134211',
  'G': '320003&f=12--34',
  'G#': '466544&f=134211',

  // Minor
  'Am': 'x02210&f=--231-',
  'A#m': 'x13321&f=113421',
  'Bm': 'x24432&f=113421',
  'Cm': 'x35543&f=113421',
  'C#m': 'x46654&f=113421',
  'Dm': 'xx0231&f=---231',
  'D#m': 'x68876',
  'Em': '022000&f=-23---',
  'Fm': '133111&f=134111',
  'F#m': '244222&f=134111',
  'Gm': '355333&f=134111',
  'G#m': '466444&f=134111',

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
  // 'A+': 'x02220',
  // 'A#+': 'x13331',
  // 'B+': 'x24442',
  // 'C+': 'x32010',
  // 'C#+': 'x43121',
  // 'D+': 'xx0232',
  // 'D#+': 'x6544x',
  // 'E+': '022100',
  // 'F+': '133211',
  // 'F#+': '244322',
  // 'G+': '320003',
  // 'G#+': '466544',

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

  ///////////// 5th /////////////

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

  ///////////// Sixth Chords  /////////////

  // 6th
  'A6': 'x02222',
  'A#6': 'x13333',
  'B6': 'x24444',
  'C6': 'x35555',
  'C#6': 'x46666',
  'D6': 'xx0202',
  'D#6': 'xx1013',
  'E6': '022120',
  'F6': '100211',
  'F#6': '21132x',
  'G6': '320000',
  'G#6': '431111',

  // Minor 6th
  'Am6': 'x02212',
  'A#m6': 'x13021',
  'Bm6': 'x20102',
  'Cm6': 'x31213',
  'C#m6': 'x42324',
  'Dm6': 'xx0201',
  'D#m6': 'xx1312',
  'Em6': '022020',
  'Fm6': '133131',
  'F#m6': '20122x',
  'Gm6': '310030',
  'G#m6': 'xxx101',


  ///////////// Seventh Chords /////////////

  // 7th
  'A7': 'x02020',
  'A#7': 'x13131',
  'B7': 'x21202',
  'C7': 'x32310',
  'C#7': 'x46464',
  'D7': 'xx0212',
  'D#7': 'xx1023',
  'E7': '020100',
  'F7': '131211&f=131211',
  'F#7': '242322',
  'G7': '320001',
  'G#7': '464544',

  // Major 7th
  'AM7': 'x02120',
  'A#M7': 'x13231',
  'BM7': 'x24342',
  'CM7': 'x32000',
  'C#M7': 'x43111',
  'DM7': 'xx0222',
  'D#M7': 'xx1333',
  'EM7': '021100',
  'FM7': '132211',
  'F#M7': '243322',
  'GM7': '354433',
  'G#M7': '465544',

  // Minor 7th
  'Am7': 'x02010',
  'A#m7': 'x13121',
  'Bm7': 'x20202',
  'Cm7': 'x35343',
  'C#m7': 'x46454',
  'Dm7': 'xx0211',
  'D#m7': 'xx1322',
  'Em7': '020000',
  'Fm7': '131111',
  'F#m7': '202220',
  'Gm7': '353333',
  'G#m7': 'xxx102',

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
  'A+7': 'x0302x&f=x0201x',
  // 'A#+7': 'x13131',
  // 'B+7': 'x21202',
  // 'C+7': 'x32310',
  // 'C#+7': 'x46464',
  // 'D+7': 'xx0212',
  // 'D#+7': 'xx1023',
  // 'E+7': '020100',
  // 'F+7': '131211',
  // 'F#+7': '242322',
  // 'G+7': '320001',
  // 'G#+7': '464544',

  ///////////// 9th /////////////
  'A9': 'x02423&f=x01312',
  'A#9': 'x1011x',
  'B9': 'x2122x',
  'C9': 'x32330',
  'C#9': 'x4344x',
  'D9': 'xx0210',
  'D#9': 'x6566x',
  'E9': '020102',
  'F9': '131213',
  'F#9': '242324',
  'G9': '353435',
  'G#9': '464546',

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
};

/** Returns chord layout for the given chord name (visual name in the chords-parser-lib.ts) */
export function getChordLayout(name: string): ChordLayout|undefined {
  if (!name || name.length == 0) {
    return undefined;
  }
  let note = name.charAt(0).toUpperCase();
  if (note === 'H') {
    note = 'B';
  }
  const key = note + name.substr(1);
  const res = CHORDS_LAYOUTS[key];
  if (!res) {
    return undefined;
  }
  const tokens = res.split('&');
  return {
    name: name,
    positions: tokens[0],
    fingers: tokens.length > 1 && tokens[1] ? tokens[1] : ''
  };
}
