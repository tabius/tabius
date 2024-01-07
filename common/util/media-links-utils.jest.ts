import { getYoutubeVideoIdFromLink, isValidYoutubeId } from '@common/util/media-links-utils';

describe('Media Links Utils', () => {
  it('should know valid youtube id form', () => {
    expect(isValidYoutubeId('')).toBeFalsy();
    expect(isValidYoutubeId('123456')).toBeFalsy();
    expect(isValidYoutubeId(' 123456789')).toBeFalsy();
    expect(isValidYoutubeId('mT9LJSad8h0')).toBeTruthy();
    expect(isValidYoutubeId('mT9LJS_d8h0')).toBeTruthy();
    expect(isValidYoutubeId('mT9LJS/d8h0')).toBeFalsy();
  });

  it('should parse canonical link form', () => {
    expect(getYoutubeVideoIdFromLink('https://youtube.com/watch?v=123456789')).toBe('123456789');
  });

  it('should parse canonical link form with other params', () => {
    expect(getYoutubeVideoIdFromLink('https://www.youtube.com/watch?v=9ILAv71l1qs&feature=youtu.be')).toBe('9ILAv71l1qs');
  });

  it('should parse "youtu.be" link form', () => {
    expect(getYoutubeVideoIdFromLink('https://youtu.be/tCfiUd4hw')).toBe('tCfiUd4hw');
  });

  it('should parse "youtu.be: link form as a param', () => {
    expect(getYoutubeVideoIdFromLink('https://www.youtube.com/watch?v=youtu.be/hVtOBrHZd7Q')).toBe('hVtOBrHZd7Q');
  });

  it('should return undefined for bad links', () => {
    expect(getYoutubeVideoIdFromLink('https://youtube.net/watch?v=123456789')).toBeUndefined();
    expect(getYoutubeVideoIdFromLink('https://youtu.bee/watch?v=123456789')).toBeUndefined();
  });
});
