import {Chord, CHORD_TONES} from '@app/utils/chords-parser-lib';
import {parseChord} from '@app/utils/chords-parser';
import {transpose} from '@app/utils/chords-renderer';
import * as assert from 'assert';
import {checkToneIsFlat, detectKeyAsMinor, getTransposeDistance, KEY_VARIANTS} from '@app/utils/key-detector';


function c(chordsLine: string, transposeSteps = 0, isFlat = false): Chord[] {
  const chords: Chord[] = [];
  for (const chordText of chordsLine.split(' ')) {
    const chordLocation = parseChord(chordText)!;
    assert(chordLocation !== undefined, `Failed to parse chord: ${chordText}`);
    const tone = transpose(chordLocation.chord.tone, transposeSteps, isFlat);
    chords.push({...chordLocation.chord, tone});
  }
  return chords;
}

describe('Key detector', () => {

  describe('getTransposeDistance', () => {
    it('should pass minimal sanity tests', () => {
      expect(getTransposeDistance('A', 'E')).toBe(7);
      expect(getTransposeDistance('E', 'A')).toBe(-7);
    });

    it('should return valid distance for all variants', () => {
      let idx1 = 0;
      for (let toneVariant1 of KEY_VARIANTS) {
        idx1++;
        for (let tone1 of toneVariant1) {
          let idx2 = 0;
          for (let toneVariant2 of KEY_VARIANTS) {
            idx2++;
            for (let tone2 of toneVariant2) {
              expect(getTransposeDistance(tone1, tone2)).toBe(idx2 - idx1);
            }
          }
        }
      }
    });
  });

  describe('detectKeyAsMinor', () => {

    it('should return undefined for empty array', () => {
      expect(detectKeyAsMinor([])).toBe(undefined);
    });

    it('should detect valid tones in simple case', () => {
      for (const key of CHORD_TONES) {
        const isFlat = checkToneIsFlat(key);
        let i = getTransposeDistance('A', key);
        expect(detectKeyAsMinor(c('Am', i, isFlat))).toBe(key);
        expect(detectKeyAsMinor(c('Am C', i, isFlat))).toBe(key);
        expect(detectKeyAsMinor(c('Am Dm E', i, isFlat))).toBe(key);
        expect(detectKeyAsMinor(c('Am Dm E7', i, isFlat))).toBe(key);
        expect(detectKeyAsMinor(c('Am Dm Em', i, isFlat))).toBe(key);
        expect(detectKeyAsMinor(c('Am Dm Em7', i, isFlat))).toBe(key);
        expect(detectKeyAsMinor(c('Am Dm G C', i, isFlat))).toBe(key);
        expect(detectKeyAsMinor(c('Am Dm G7 C', i, isFlat))).toBe(key);
        expect(detectKeyAsMinor(c('Am Dm E F G C', i, isFlat))).toBe(key);
        expect(detectKeyAsMinor(c('Am C7', i, isFlat))).toBe(key);
        expect(detectKeyAsMinor(c('Am G7', i, isFlat))).toBe(key);
        expect(detectKeyAsMinor(c('Am E7', i, isFlat))).toBe(key);
      }
    });

    it('should detect valid tones when some chords is out of key', () => {
      expect(detectKeyAsMinor(c('Am Em C G Hm D'))).toBe('E');
      expect(detectKeyAsMinor(c('Am Em F#m G Hm D'))).toBe('B');
    });

    it('should return undefined for strange sequences', () => {
      expect(detectKeyAsMinor(c('Aaug9 Daug7'))).toBe(undefined);
    });

    it('should ignore complex chords when needed', () => {
      expect(detectKeyAsMinor(c('Am Dm Em Daug7'))).toBe('A');
    });

    it('regression test 1', () => {
      expect(detectKeyAsMinor(c('Dm Dm Gm Dm Bb G Bb G C F Bb G'))).toBe('D');
    });

    it('regression test 2', () => {
      expect(detectKeyAsMinor(c('E E A E B A E'))).toBe('Db');
    });

    it('regression test 3', () => {
      expect(detectKeyAsMinor(c('C C F C G F C'))).toBe('A');
    });

  });

});
