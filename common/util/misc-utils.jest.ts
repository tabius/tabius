import { toSafeSearchText } from '@common/util/misc-utils';

describe('toSafeSearchText', () => {
  it('should keep letters and numbers', () => {
    expect(toSafeSearchText('letters and numbers123')).toBe('letters and numbers123');
  });

  it('should remove non-letters and non-numbers', () => {
    expect(toSafeSearchText('"quote" \'quote\' «quote»')).toBe('quote quote quote');
    expect(toSafeSearchText('Hi! Yes. No!')).toBe('Hi Yes No');
    expect(toSafeSearchText('[Hi(Yes)|No!}')).toBe('Hi Yes No');
  });

  it('normalize whitespaces', () => {
    expect(toSafeSearchText('a  b!!c')).toBe('a b c');
    expect(toSafeSearchText('!!!')).toBe('');
    expect(toSafeSearchText('a!!!')).toBe('a');
    expect(toSafeSearchText('!!!a')).toBe('a');
  });
});
