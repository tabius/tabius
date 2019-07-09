import {CHORDS_LAYOUTS} from '@app/utils/chords-layout-lib';
import {VISUAL_TYPE_BY_CHORD_TYPE} from '@app/utils/chords-parser-lib';


describe('Chords layout lib', () => {

  it('should use display names from chord-parser-lib', () => {
    const visualChordNames = [...VISUAL_TYPE_BY_CHORD_TYPE.values()];
    const chordNamesFromLayouts = Object.keys(CHORDS_LAYOUTS);
    for (const chordName of chordNamesFromLayouts) {
      const layoutChordNameSuffix = chordName.substring(chordName.length > 1 && (chordName.charAt(1) === '#' || chordName.charAt(1) == 'b') ? 2 : 1);
      expect(visualChordNames).toContain(layoutChordNameSuffix, `Chord layout entry does not match any visual chord name: ${chordName}`);
    }
  });


  it('should not have duplicate layouts', () => {
    function removeFingers(v: string) {
      const fingeringPos = v.indexOf('&');
      return fingeringPos < 0 ? v : v.substring(0, fingeringPos);
    }

    const allLayouts = Object.values(CHORDS_LAYOUTS).map(removeFingers);
    const allLayoutsString = allLayouts.join('\n');
    for (const layout of allLayouts) {
      expect(allLayoutsString.indexOf(layout)).toBe(allLayoutsString.lastIndexOf(layout), `Duplicate chord layout: ${layout}`);
    }
  });

});
