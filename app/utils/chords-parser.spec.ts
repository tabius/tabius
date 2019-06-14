import {parseChord, parseChords, parseChordsLine} from '@app/utils/chords-parser';

describe('Chords Parser, parseChord', () => {

  it('should recognize simple chords', () => {
    expect(parseChord('A', 0, 1)).toEqual({chord: {name: 'A'}, startIdx: 0, endIdx: 1});
    expect(parseChord('Am Dm', 0, 10)).toEqual({chord: {name: 'A', minor: true}, startIdx: 0, endIdx: 2});
    expect(parseChord('C#m(III)', 0, 10)).toEqual({chord: {name: 'C#', minor: true}, startIdx: 0, endIdx: 3});
  });

  it('should recognize chords with suffixes', () => {
    expect(parseChord('Esus2', 0, 10)).toEqual({chord: {name: 'E', suffix: 'sus2'}, startIdx: 0, endIdx: 5});
  });

  it('should support long minor/major variants', () => {
    expect(parseChord('Dmajor')).toEqual({chord: {name: 'D'}, startIdx: 0, endIdx: 6});
    expect(parseChord('Cmin')).toEqual({chord: {name: 'C', minor: true}, startIdx: 0, endIdx: 4});
    expect(parseChord('G#minor')).toEqual({chord: {name: 'G#', minor: true}, startIdx: 0, endIdx: 7});
  });

  it('should recognize chords by a valid prefix', () => {
    expect(parseChord('D*')).toEqual({chord: {name: 'D'}, startIdx: 0, endIdx: 1});
    expect(parseChord('C7/')).toEqual({chord: {name: 'C', suffix: '7'}, startIdx: 0, endIdx: 2});
    expect(parseChord('Em$')).toEqual({chord: {name: 'E', minor: true}, startIdx: 0, endIdx: 2});
  });

  it('should not return chords for a usual words', () => {
    expect(parseChord('Capital')).toBeUndefined();
    expect(parseChord('Amplifier')).toBeUndefined();
    expect(parseChord('House')).toBeUndefined();
  });

});


describe('Chords Parser, parseChordsLine', () => {

  it('should recognize 1-chord lines', () => {
    expect(parseChordsLine(' Cmajor ')).toEqual([{chord: {name: 'C'}, startIdx: 1, endIdx: 7}]);
  });

  it('should recognize multi-chords lines', () => {
    expect(parseChordsLine(' Cmajor D')).toEqual([{chord: {name: 'C'}, startIdx: 1, endIdx: 7}, {chord: {name: 'D'}, startIdx: 8, endIdx: 9}]);
    expect(parseChordsLine('Hsus2 Gsus4 Esus F#sus2 G+ E7').length).toBe(6);
  });

  it('should correctly process lines with non-chords text', () => {
    expect(parseChordsLine('A little snail')).toEqual([]);
  });

  it('should correctly parse chords with non-chords text in the line', () => {
    expect(parseChordsLine(' A E - 2x')).toEqual([
      {chord: {name: 'A'}, startIdx: 1, endIdx: 2},
      {chord: {name: 'E'}, startIdx: 3, endIdx: 4},
    ]);
  });

  it('should correctly filter string tabs', () => {
    expect(parseChordsLine('E--2-3--4-4\nC--3-3-2')).toEqual([]);
    expect(parseChordsLine('A|--2-3--4-4\nC|--3-3-2')).toEqual([]);
  });

});


describe('Chords Parser, parseChords', () => {

  it('should recognize chords on multiple lines', () => {
    expect(parseChords(' Cm \n G7 ')).toEqual([
      {chord: {name: 'C', minor: true}, startIdx: 1, endIdx: 3},
      {chord: {name: 'G', suffix: '7'}, startIdx: 6, endIdx: 8}
    ]);

    expect(parseChords('A\n\nB')).toEqual([
      {chord: {name: 'A'}, startIdx: 0, endIdx: 1},
      {chord: {name: 'B'}, startIdx: 3, endIdx: 4}
    ]);

    expect(parseChords('A\n\nB\n \n')).toEqual([
      {chord: {name: 'A'}, startIdx: 0, endIdx: 1},
      {chord: {name: 'B'}, startIdx: 3, endIdx: 4}
    ]);
  });

  it('should recognize special whitespace chars', () => {
    expect(parseChords('A\r\nB')).toEqual([
      {chord: {name: 'A'}, startIdx: 0, endIdx: 1},
      {chord: {name: 'B'}, startIdx: 3, endIdx: 4}
    ]);
    expect(parseChords('A\tB')).toEqual([
      {chord: {name: 'A'}, startIdx: 0, endIdx: 1},
      {chord: {name: 'B'}, startIdx: 2, endIdx: 3}
    ]);
  });

});
