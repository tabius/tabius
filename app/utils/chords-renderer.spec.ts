import {getToneByToneNumber, renderChord, renderChords} from '@app/utils/chords-renderer';
import {Chord, ChordTone, ChordType} from '@app/utils/chords-parser-lib';

const c = (tone: ChordTone, type: ChordType): Chord => ({tone, type});

describe('Chords renderer', () => {

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
    expect(renderChords('Am Em')).toEqual('Am Em');
  });

  it('should render chords with non-standard characters', () => {
    expect(renderChords('C7/9', {tag: 'i'})).toEqual('<i>C7/9</i>');
  });


  it('should transpose chords correctly to +1', () => {
    expect(renderChords('A', {transpose: 1})).toEqual('A#');
    expect(renderChords('A#', {transpose: 1})).toEqual('B ');
    expect(renderChords('Bb', {transpose: 1})).toEqual('B ');
    expect(renderChords('B', {transpose: 1})).toEqual('C');
    expect(renderChords('C', {transpose: 1})).toEqual('C#');
    expect(renderChords('C#', {transpose: 1})).toEqual('D ');
    expect(renderChords('Db', {transpose: 1})).toEqual('D ');
    expect(renderChords('D', {transpose: 1})).toEqual('D#');
    expect(renderChords('D#', {transpose: 1})).toEqual('E ');
    expect(renderChords('Eb', {transpose: 1})).toEqual('E ');
    expect(renderChords('E', {transpose: 1})).toEqual('F');
    expect(renderChords('F', {transpose: 1})).toEqual('F#');
    expect(renderChords('F#', {transpose: 1})).toEqual('G ');
    expect(renderChords('Gb', {transpose: 1})).toEqual('G ');
    expect(renderChords('G', {transpose: 1})).toEqual('G#');
    expect(renderChords('G#', {transpose: 1})).toEqual('A ');
    expect(renderChords('Ab', {transpose: 1})).toEqual('A ');
    expect(renderChords('H', {transpose: 1})).toEqual('C');
  });

  it('should transpose chords correctly to -1', () => {
    expect(renderChords('A', {transpose: -1})).toEqual('G#');
    expect(renderChords('A#', {transpose: -1})).toEqual('A ');
    expect(renderChords('Bb', {transpose: -1})).toEqual('A ');
    expect(renderChords('B', {transpose: -1})).toEqual('A#');
    expect(renderChords('C', {transpose: -1})).toEqual('B');
    expect(renderChords('C#', {transpose: -1})).toEqual('C ');
    expect(renderChords('Db', {transpose: -1})).toEqual('C ');
    expect(renderChords('D', {transpose: -1})).toEqual('C#');
    expect(renderChords('D#', {transpose: -1})).toEqual('D ');
    expect(renderChords('Eb', {transpose: -1})).toEqual('D ');
    expect(renderChords('E', {transpose: -1})).toEqual('D#');
    expect(renderChords('F', {transpose: -1})).toEqual('E');
    expect(renderChords('F#', {transpose: -1})).toEqual('F ');
    expect(renderChords('Gb', {transpose: -1})).toEqual('F ');
    expect(renderChords('G', {transpose: -1})).toEqual('F#');
    expect(renderChords('G#', {transpose: -1})).toEqual('G ');
    expect(renderChords('Ab', {transpose: -1})).toEqual('G ');
    expect(renderChords('H', {transpose: -1})).toEqual('A#');
  });

  it('should transpose correctly to large numbers', () => {
    expect(renderChords('A', {transpose: 13})).toEqual('A#');
    expect(renderChords('A', {transpose: -13})).toEqual('G#');
    expect(renderChords('A', {transpose: 12 * 100})).toEqual('A');
    expect(renderChords('A', {transpose: -12 * 100})).toEqual('A');
  });

  it('should render H but not B if asked', () => {
    expect(renderChord(c('B', 'maj'), {useH: true})).toEqual('H');
    expect(renderChord(c('B', 'maj'))).toEqual('B');
  });

  it('should use minResultStringLength', () => {
    expect(renderChord(c('A', 'maj'), {}, 3)).toEqual('A  ');
    expect(renderChord(c('A', 'min'), {}, 1)).toEqual('Am');
  });

  it('should respect flat|sharp flags in getToneByToneNumber', () => {
    expect(getToneByToneNumber(1, false)).toEqual('C#');
    expect(getToneByToneNumber(1, true)).toEqual('Db');
  });

  it('should parse long chord names (minor/major) correctly', () => {
    expect(renderChords('Cmajor', {tag: 'i'})).toEqual('<i>C</i>     ');
    expect(renderChords('C#maj', {tag: 'i'})).toEqual('<i>C#</i>   ');
    expect(renderChords('Cminor', {tag: 'i'})).toEqual('<i>Cm</i>    ');
    expect(renderChords('C#min', {tag: 'i'})).toEqual('<i>C#m</i>  ');
    expect(renderChords('CM', {tag: 'i'})).toEqual('<i>C</i> ');
  });

  it('should not render usual text as a chord', () => {
    expect(renderChords('A little snake')).toEqual('A little snake');
  });

  it('should ignore lines with a non-chord text', () => {
    expect(renderChords('Am Em and some text')).toEqual('Am Em and some text');
    expect(renderChords('Am Em DmC#')).toEqual('Am Em DmC#');
  });

  it('should support rendering mode with chords hidden', () => {
    expect(renderChords('Am Em Dm and some text', {hideChords: true})).toEqual('and some text');
    expect(renderChords('line 1 \n Am Em \n line 2', {hideChords: true})).toEqual('line 1 \n line 2');
    expect(renderChords('line 1 \n Am Em \n G\nline 2', {hideChords: true})).toEqual('line 1 \nline 2');
    expect(renderChords('line 1 \n Am Em \n \nline 2', {hideChords: true})).toEqual('line 1 \n \nline 2');
  });

});
