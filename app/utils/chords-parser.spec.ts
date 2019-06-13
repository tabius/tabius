import {parseChords, parseChordsLine, parseLeadingChord} from '@app/utils/chords-parser';

describe('Chords Parser, parseLeadingChord', () => {

  it('should recognize simple chords', () => {
    expect(parseLeadingChord('A', 0, 1)).toEqual({chord: {name: 'A'}, startIdx: 0, endIdx: 1});
    expect(parseLeadingChord('Am Dm', 0, 10)).toEqual({chord: {name: 'A', minor: true}, startIdx: 0, endIdx: 2});
    expect(parseLeadingChord('C#m(III)', 0, 10)).toEqual({chord: {name: 'C#', minor: true}, startIdx: 0, endIdx: 3});
  });

  it('should recognize chords with suffixes', () => {
    expect(parseLeadingChord('Esus2', 0, 10)).toEqual({chord: {name: 'E', suffix: 'sus2'}, startIdx: 0, endIdx: 5});
  });

  it('should support about long minor/major variants', () => {
    expect(parseLeadingChord('Dmajor')).toEqual({chord: {name: 'D'}, startIdx: 0, endIdx: 6});
    expect(parseLeadingChord('Cmin')).toEqual({chord: {name: 'C', minor: true}, startIdx: 0, endIdx: 4});
    expect(parseLeadingChord('G#minor')).toEqual({chord: {name: 'G#', minor: true}, startIdx: 0, endIdx: 7});
  });

});


describe('Chords Parser, parseChordsLine', () => {

  it('should recognize 1-chord lines', () => {
    expect(parseChordsLine(' Cmajor ')).toEqual([{chord: {name: 'C'}, startIdx: 1, endIdx: 7}]);
  });

  it('should recognize multi-chords lines', () => {
    expect(parseChordsLine(' Cmajor D')).toEqual([{chord: {name: 'C'}, startIdx: 1, endIdx: 7}, {chord: {name: 'D'}, startIdx: 8, endIdx: 9}]);
  });

  it('should correctly process lines with non-chords text', () => {
    expect(parseChordsLine('A little snail')).toEqual([]);
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

});
