import {applyBassTone, CHORDS_LAYOUTS, NEXT_TONE_LETTER_MAP} from '@common/util/chords-layout-lib';
import {VISUAL_TYPE_BY_CHORD_TYPE} from '@common/util/chords-parser-lib';

describe('Chords layout lib', () => {

  it('should use chord types from chord-parser-lib', () => {
    const chordNamesFromLayouts = Object.keys(CHORDS_LAYOUTS);
    for (const chordName of chordNamesFromLayouts) {
      const layoutChordNameSuffix = chordName.substring(chordName.length > 1 && (chordName.charAt(1) === '#' || chordName.charAt(1) === 'b') ? 2 : 1);
      const found = VISUAL_TYPE_BY_CHORD_TYPE.has(layoutChordNameSuffix as any);
      expect(found || `Chord layout entry does not match any chord type: ${chordName}`).toBe(true);
    }
  });

  it('should have 6-fingers layouts with a valid characters', () => {
    const allLayouts = Object.keys(CHORDS_LAYOUTS).map(key => CHORDS_LAYOUTS[key]).map(removeFingers);

    function hasValidLayoutChars(layout: string): boolean {
      for (let i = 0; i < layout.length; i++) {
        const c = layout.charAt(i);
        if (!'x0123456789'.includes(c)) {
          return false;
        }
      }
      return true;
    }

    for (const layout of allLayouts) {
      expect(layout.length || `Bad chord layout length: ${layout}`).toBe(6);
      expect(hasValidLayoutChars(layout) || `Bad chord layout length: ${layout}`).toBe(true);
    }
  });

  it('should not have duplicate layouts', () => {
    const removeFlats = (v: string): boolean => v.length < 2 || v.charAt(1) != 'b';
    const allLayouts = Object.keys(CHORDS_LAYOUTS).filter(removeFlats).map(key => CHORDS_LAYOUTS[key]).map(removeFingers);
    const allLayoutsString = allLayouts.join('\n');
    for (const layout of allLayouts) {
      expect(allLayoutsString.indexOf(layout) ?? `Bad chord layout length: ${layout}`).toBe(allLayoutsString.lastIndexOf(layout));
    }
  });

  it('should have both flats and sharps', () => {
    for (const name in CHORDS_LAYOUTS) {
      if (name.length >= 2 && name.charAt(1) === '#') {
        const sharpLayout = CHORDS_LAYOUTS[name];
        const flatName = NEXT_TONE_LETTER_MAP[name.charAt(0)] + 'b' + name.substring(2);
        const flatLayout = CHORDS_LAYOUTS[flatName];
        expect(flatLayout || `Layout for ${name} is not the same as for ${flatName}`).toBe(sharpLayout);
      }
    }
  });

  it('should assign bass strings correctly', () => {
    expect(applyBassTone('000000', 'G')).toBe('300000');
    expect(applyBassTone('555555', 'E')).toBe('055555');
    expect(applyBassTone('555555', 'F')).toBe('x85555');
    expect(applyBassTone('222222', 'F')).toBe('122222');
  });

});

function removeFingers(v: string): string {
  const fingeringPos = v.indexOf('&');
  return fingeringPos < 0 ? v : v.substring(0, fingeringPos);
}
