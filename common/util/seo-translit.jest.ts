import {getTranslitAnyCase} from '@common/util/seo-translit';

describe('SEO-translit', () => {

  it('should not latin letters', () => {
    expect(getTranslitAnyCase('abcdefghikjlmnopqrstuvwxyzABCDEFGHIKJLMNOPQRSTUVWXYZ')).toEqual('abcdefghikjlmnopqrstuvwxyzABCDEFGHIKJLMNOPQRSTUVWXYZ');
  });

  it('should not change digits', () => {
    expect(getTranslitAnyCase('0123456789')).toEqual('0123456789');
  });

  it('should replace unknown symbols with "-"', () => {
    expect(getTranslitAnyCase('London is the capital of GB')).toEqual('London-is-the-capital-of-GB');
  });

  it('should trim leading and trailing "-" symbols', () => {
    expect(getTranslitAnyCase(' ok')).toEqual('ok');
    expect(getTranslitAnyCase('ok ')).toEqual('ok');
    expect(getTranslitAnyCase(' ok ')).toEqual('ok');
    expect(getTranslitAnyCase('-ok-')).toEqual('ok');
  });

  it('should correctly translate complex letters', () => {
    expect(getTranslitAnyCase('эхо')).toEqual('ehkho');
    expect(getTranslitAnyCase('Эхо')).toEqual('Ehkho');
    expect(getTranslitAnyCase('эХо')).toEqual('ehKho');
    expect(getTranslitAnyCase('Хабаровск')).toEqual('Habarovsk');
  });

});
