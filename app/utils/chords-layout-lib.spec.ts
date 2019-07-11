import {CHORDS_LAYOUTS} from '@app/utils/chords-layout-lib';
import {NEXT_TONE_LETTER_MAP, VISUAL_TYPE_BY_CHORD_TYPE} from '@app/utils/chords-parser-lib';


describe('Chords layout lib', () => {

  it('should use chord types from chord-parser-lib', () => {
    const chordNamesFromLayouts = Object.keys(CHORDS_LAYOUTS);
    for (const chordName of chordNamesFromLayouts) {
      const layoutChordNameSuffix = chordName.substring(chordName.length > 1 && (chordName.charAt(1) === '#' || chordName.charAt(1) == 'b') ? 2 : 1);
      const found = VISUAL_TYPE_BY_CHORD_TYPE.has(layoutChordNameSuffix as any);
      expect(found).toBeTruthy(`Chord layout entry does not match any chord type: ${chordName}`);
    }
  });

  it('should not have duplicate layouts', () => {
    function removeFingers(v: string): string {
      const fingeringPos = v.indexOf('&');
      return fingeringPos < 0 ? v : v.substring(0, fingeringPos);
    }

    function removeFlats(v: string): boolean {
      return v.length < 2 || v.charAt(1) != 'b';
    }

    const allLayouts = Object.keys(CHORDS_LAYOUTS).filter(removeFlats).map(key => CHORDS_LAYOUTS[key]).map(removeFingers);
    const allLayoutsString = allLayouts.join('\n');
    for (const layout of allLayouts) {
      expect(allLayoutsString.indexOf(layout)).toBe(allLayoutsString.lastIndexOf(layout), `Duplicate chord layout: ${layout}`);
    }
  });

  it('should have both flats and sharps', () => {
    for (const name in CHORDS_LAYOUTS) {
      if (name.length >= 2 && name.charAt(1) === '#') {
        const sharpLayout = CHORDS_LAYOUTS[name];
        const flatName = NEXT_TONE_LETTER_MAP[name.charAt(0)] + 'b' + name.substring(2);
        const flatLayout = CHORDS_LAYOUTS[flatName];
        expect(flatLayout).toBe(sharpLayout, `Layout for ${name} is not the same as for ${flatName}`);
      }
    }
  });

});
