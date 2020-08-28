import {isTabsLine, parseChord, parseChords, parseChordsLine} from '@app/utils/chords-parser';
import {Chord, ChordTone, ChordType} from '@app/utils/chords-parser-lib';

const c = (tone: ChordTone, type: ChordType, bassTone?: ChordTone): Chord => ({tone, type, bassTone});

describe('Chords parser, parseChord', () => {

  it('should recognize simple chords', () => {
    expect(parseChord('A', 0, 1)).toEqual({chord: c('A', 'maj'), startIdx: 0, endIdx: 1});
    expect(parseChord('Am Dm', 0, 10)).toEqual({chord: c('A', 'min'), startIdx: 0, endIdx: 2});
    expect(parseChord('C#m(III)', 0, 10)).toEqual({chord: c('C#', 'min'), startIdx: 0, endIdx: 8});
  });

  it('should recognize chords with suffixes', () => {
    expect(parseChord('Esus2')).toEqual({chord: c('E', 'sus2'), startIdx: 0, endIdx: 5});
    expect(parseChord('C#m7+5')).toEqual({chord: c('C#', 'min7dim5'), startIdx: 0, endIdx: 6});
  });

  it('should support long minor/major variants', () => {
    expect(parseChord('Dmajor')).toEqual({chord: c('D', 'maj'), startIdx: 0, endIdx: 6});
    expect(parseChord('Cmin')).toEqual({chord: c('C', 'min'), startIdx: 0, endIdx: 4});
    expect(parseChord('G#minor')).toEqual({chord: c('G#', 'min'), startIdx: 0, endIdx: 7});
  });

  it('should recognize chords by a valid prefix', () => {
    expect(parseChord('D*')).toEqual({chord: c('D', 'maj'), startIdx: 0, endIdx: 1});
    expect(parseChord('C7/')).toEqual({chord: c('C', 'dom7'), startIdx: 0, endIdx: 2});
    expect(parseChord('Em$')).toEqual({chord: c('E', 'min'), startIdx: 0, endIdx: 2});
  });

  it('should not return chords for a usual words', () => {
    expect(parseChord('Capital')).toBeUndefined();
    expect(parseChord('Amplifier')).toBeUndefined();
    expect(parseChord('House')).toBeUndefined();
    expect(parseChord('D’aller')).toBeUndefined();
  });

  it('should use the longest chord name', () => {
    expect(parseChord('Amin6')).toEqual({chord: c('A', 'min6'), startIdx: 0, endIdx: 5});
    expect(parseChord('A7sus24')).toEqual({chord: c('A', '7sus24'), startIdx: 0, endIdx: 7});
  });

  it('should parse chords with "/" in the middle', () => {
    expect(parseChord('A7/9')).toEqual({chord: c('A', '7/9'), startIdx: 0, endIdx: 4});
  });

  it('should recognize chords with raw type variation chars', () => {
    expect(parseChord('A♯')).toEqual({chord: c('A#', 'maj'), startIdx: 0, endIdx: 2});
    expect(parseChord('A♭m')).toEqual({chord: c('Ab', 'min'), startIdx: 0, endIdx: 3});
    expect(parseChord('AΔ')).toEqual({chord: c('A', 'maj'), startIdx: 0, endIdx: 2});
    expect(parseChord('A°')).toEqual({chord: c('A', 'dim'), startIdx: 0, endIdx: 2});
  });

  it('does not false predict A-- as Am', () => {
    expect(parseChord('A-')).toEqual({chord: c('A', 'min'), startIdx: 0, endIdx: 2});
    expect(parseChord('A--')).toBeUndefined();
  });

  it('should recognize bass tones', () => {
    expect(parseChord('A/C')).toEqual({chord: c('A', 'maj', 'C'), startIdx: 0, endIdx: 3});
    expect(parseChord('Am/D#')).toEqual({chord: c('A', 'min', 'D#'), startIdx: 0, endIdx: 5});
    expect(parseChord('Am/G(III)')).toEqual({chord: c('A', 'min', 'G'), startIdx: 0, endIdx: 9});
  });
});


describe('Chords parser, parseChordsLine', () => {

  it('should recognize 1-chord lines', () => {
    expect(parseChordsLine(' Cmajor ')).toEqual([{chord: c('C', 'maj'), startIdx: 1, endIdx: 7}]);
  });

  it('should recognize multi-chords lines', () => {
    expect(parseChordsLine(' Cmajor D')).toEqual([
      {chord: c('C', 'maj'), startIdx: 1, endIdx: 7},
      {chord: c('D', 'maj'), startIdx: 8, endIdx: 9}
    ]);
    expect(parseChordsLine('Hsus2 Gsus4 Esus F#sus2 G+ E7').length).toBe(6);
  });

  it('should correctly process lines with non-chords text', () => {
    expect(parseChordsLine('A little snail')).toEqual([]);
    expect(parseChordsLine('A Little Snail, A little Snail')).toEqual([]);
    expect(parseChordsLine('On The Go')).toEqual([]);
    expect(parseChordsLine('Go Go Go')).toEqual([]);
    expect(parseChordsLine('Gо Gо, Jонnnу B. Gооdе')).toEqual([]);
    expect(parseChordsLine('G, Am } 3 times')).toEqual([
      {chord: c('G', 'maj'), startIdx: 0, endIdx: 1},
      {chord: c('A', 'min'), startIdx: 3, endIdx: 5},
    ]);
    expect(parseChordsLine('G° Am')).toEqual([
      {chord: c('G', 'dim'), startIdx: 0, endIdx: 2},
      {chord: c('A', 'min'), startIdx: 3, endIdx: 5},
    ]);
  });

  it('should correctly parse chords with non-chords text in the line', () => {
    expect(parseChordsLine(' A E - 2x')).toEqual([
      {chord: c('A', 'maj'), startIdx: 1, endIdx: 2},
      {chord: c('E', 'maj'), startIdx: 3, endIdx: 4},
    ]);
  });

  it('should correctly filter string tabs', () => {
    // Note: only first line must be parsed.
    expect(parseChordsLine('E--2-3--4-4\nC--3-3-2')).toEqual([]);
    expect(parseChordsLine('A|--2-3--4-4\nC|--3-3-2')).toEqual([]);
    expect(parseChordsLine('H  ||--------1----------1h3p-0--|-----1-------------------||')).toEqual([]);
  });

  it('should detect chords in string tabs when no string is provided', () => {
    // Note: only first line must be parsed.
    expect(parseChordsLine('--Am--Dm---\nC---G---')).toEqual([
      {chord: c('A', 'min'), startIdx: 2, endIdx: 4},
      {chord: c('D', 'min'), startIdx: 6, endIdx: 8},
    ]);
  });

  it('should correctly detect tabs-like lines', () => {
    const text = 'H  ||--------1----------1h3p-0--|-----1-------------------||';
    expect(isTabsLine(text, 0, text.length)).toBeTruthy();
  });

  it('should not find chords inside  other words', () => {
    expect(parseChordsLine('123Am ABCEm')).toEqual([]);
    expect(parseChordsLine('THE DOG')).toEqual([]); // do not mark E and G as chords
  });

});


describe('Chords parser, parseChords', () => {

  it('should recognize chords on multiple lines', () => {
    expect(parseChords(' Cm \n G7 ')).toEqual([
      {chord: c('C', 'min'), startIdx: 1, endIdx: 3},
      {chord: c('G', 'dom7'), startIdx: 6, endIdx: 8}
    ]);

    expect(parseChords('A\n\nB')).toEqual([
      {chord: c('A', 'maj'), startIdx: 0, endIdx: 1},
      {chord: c('B', 'maj'), startIdx: 3, endIdx: 4}
    ]);

    expect(parseChords('A\n\nB\n \n')).toEqual([
      {chord: c('A', 'maj'), startIdx: 0, endIdx: 1},
      {chord: c('B', 'maj'), startIdx: 3, endIdx: 4}
    ]);
  });

  it('should recognize special whitespace chars', () => {
    expect(parseChords('A\r\nB')).toEqual([
      {chord: c('A', 'maj'), startIdx: 0, endIdx: 1},
      {chord: c('B', 'maj'), startIdx: 3, endIdx: 4}
    ]);
    expect(parseChords('A\tB')).toEqual([
      {chord: c('A', 'maj'), startIdx: 0, endIdx: 1},
      {chord: c('B', 'maj'), startIdx: 2, endIdx: 3}
    ]);
  });

  it('should recognize braces after chord', () => {
    expect(parseChords('A(III)')).toEqual([
      {chord: c('A', 'maj'), startIdx: 0, endIdx: 6},
    ]);
    expect(parseChords('A(5) B(II)')).toEqual([
      {chord: c('A', 'maj'), startIdx: 0, endIdx: 4},
      {chord: c('B', 'maj'), startIdx: 5, endIdx: 10}
    ]);
  });

  it('should recognize special whitespace chars', () => {
    expect(parseChords('Am/C')).toEqual([
      {chord: c('A', 'min', 'C'), startIdx: 0, endIdx: 4}
    ]);
    expect(parseChords('Am/CC')).toEqual([
      {chord: c('A', 'min'), startIdx: 0, endIdx: 2}
    ]);
  });

});
