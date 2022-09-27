export const CHORD_TONES = <const>['A', 'A#', 'Bb', 'B', 'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab'];

export type ChordTone = typeof CHORD_TONES[number];

export type ChordType = '+7B9'|'+7+9'|'+M7B9'|'+M7+9'|'add9'|'add11'|'add11+'|'2'|'5'|'6/9'
    |'7/6'|'7/9'|'7B5b9'|'7B9'|'7sus2'|'7sus24'|'7sus4'|'7susB13'|'7x11'|'7x9'|'7x9x11'|'9sus4'
    |'aug'|'aug7'|'aug9'|'augmaj7'|'augmaj9'|'B5'
    |'dim'|'dim7'|'dim9'|'dimB9'|'dim7B9'|'dom7'|'dom11'|'dom13'|'dom7dim5'|'dom9'|'half_diminished9'|'half_diminishedB9'
    |'m11B5b9'|'m11B9'|'m2'|'m7B9'|'M7B9'|'M7x11'|'m7x11'|'m7x9'|'M7x9'|'M9x11'
    |'maj'|'maj11'|'maj13'|'maj6'|'maj7'|'maj7sus2'|'maj7sus24'|'maj7sus4'|'maj9'
    |'min'|'min11'|'min13'|'min6'|'min7'|'min7dim5'|'min9'|'minmaj11'|'minmaj13'|'minmaj7'|'minmaj9'|'mM7B5'|'mM7B9'|'Mx11'
    |'sus2'|'sus2sus4'|'sus2B5'|'sus4';

export interface Chord {
  tone: ChordTone;
  type: ChordType;
  bassTone?: ChordTone;
}


export const MINOR_KEY_TONES = <const>['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab'];
