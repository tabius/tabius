import {getToneNameByNumber, renderChord, renderChords} from '@app/utils/chords-renderer';

describe('Chords Renderer ', () => {

  it('should recognize simple chords', () => {
    expect(renderChords('C', {tag: 'x'})).toEqual('<x>C</x>');
    expect(renderChords('Am', {tag: 'b'})).toEqual('<b>Am</b>');
  });

  it('should recognize multiple chords', () => {
    expect(renderChords('C Am|D7', {tag: 'i'})).toEqual('<i>C</i> <i>Am</i>|<i>D7</i>');
  });

  it('should be no-op when there are no chords', () => {
    const noChordsText = 'no chords in this text';
    expect(renderChords(noChordsText, {tag: 'i'})).toEqual(noChordsText);
  });

  it('should be no-op when tag is empty', () => {
    expect(renderChords('Am Em', {})).toEqual('Am Em');
  });

  it('should transpose chords correctly to +1', () => {
    expect(renderChords('A', {transpose: 1})).toEqual('A#');
    expect(renderChords('A#', {transpose: 1})).toEqual('B');
    expect(renderChords('Bb', {transpose: 1})).toEqual('B');
    expect(renderChords('B', {transpose: 1})).toEqual('C');
    expect(renderChords('C', {transpose: 1})).toEqual('C#');
    expect(renderChords('C#', {transpose: 1})).toEqual('D');
    expect(renderChords('Db', {transpose: 1})).toEqual('D');
    expect(renderChords('D', {transpose: 1})).toEqual('D#');
    expect(renderChords('D#', {transpose: 1})).toEqual('E');
    expect(renderChords('Eb', {transpose: 1})).toEqual('E');
    expect(renderChords('E', {transpose: 1})).toEqual('F');
    expect(renderChords('F', {transpose: 1})).toEqual('F#');
    expect(renderChords('F#', {transpose: 1})).toEqual('G');
    expect(renderChords('Gb', {transpose: 1})).toEqual('G');
    expect(renderChords('G', {transpose: 1})).toEqual('G#');
    expect(renderChords('G#', {transpose: 1})).toEqual('A');
    expect(renderChords('Ab', {transpose: 1})).toEqual('A');
    expect(renderChords('H', {transpose: 1})).toEqual('C');
  });

  it('should transpose chords correctly to -1', () => {
    expect(renderChords('A', {transpose: -1})).toEqual('G#');
    expect(renderChords('A#', {transpose: -1})).toEqual('A');
    expect(renderChords('Bb', {transpose: -1})).toEqual('A');
    expect(renderChords('B', {transpose: -1})).toEqual('A#');
    expect(renderChords('C', {transpose: -1})).toEqual('B');
    expect(renderChords('C#', {transpose: -1})).toEqual('C');
    expect(renderChords('Db', {transpose: -1})).toEqual('C');
    expect(renderChords('D', {transpose: -1})).toEqual('C#');
    expect(renderChords('D#', {transpose: -1})).toEqual('D');
    expect(renderChords('Eb', {transpose: -1})).toEqual('D');
    expect(renderChords('E', {transpose: -1})).toEqual('D#');
    expect(renderChords('F', {transpose: -1})).toEqual('E');
    expect(renderChords('F#', {transpose: -1})).toEqual('F');
    expect(renderChords('Gb', {transpose: -1})).toEqual('F');
    expect(renderChords('G', {transpose: -1})).toEqual('F#');
    expect(renderChords('G#', {transpose: -1})).toEqual('G');
    expect(renderChords('Ab', {transpose: -1})).toEqual('G');
    expect(renderChords('H', {transpose: -1})).toEqual('A#');
  });

  it('should transpose correctly to large numbers', () => {
    expect(renderChords('A', {transpose: 13})).toEqual('A#');
    expect(renderChords('A', {transpose: -13})).toEqual('G#');
    expect(renderChords('A', {transpose: 12 * 100})).toEqual('A');
    expect(renderChords('A', {transpose: -12 * 100})).toEqual('A');
  });

  it('should render H but not B if asked', () => {
    expect(renderChord({name: 'B'}, {useH: true})).toEqual('H');
    expect(renderChord({name: 'H'}, {useH: true})).toEqual('H');
    expect(renderChord({name: 'H'}, {})).toEqual('B');
    expect(renderChord({name: 'B'}, {})).toEqual('B');
  });

  it('should respect flat|sharp flags in getToneNameByNumber', () => {
    expect(getToneNameByNumber(1, false)).toEqual('C#');
    expect(getToneNameByNumber(1, true)).toEqual('Db');
  });

  it('should parse long chord names (minor/major) correctly', () => {
    expect(renderChords('Cmajor', {tag: 'i'})).toEqual('<i>C</i>');
    expect(renderChords('C#majo', {tag: 'i'})).toEqual('<i>C#</i>o');
    expect(renderChords('Cminor', {tag: 'i'})).toEqual('<i>Cm</i>');
    expect(renderChords('C#minr', {tag: 'i'})).toEqual('<i>C#m</i>r');
    expect(renderChords('CM', {tag: 'i'})).toEqual('<i>C</i>');
  });

});
