export function getFirstYoutubeVideoIdFromLinks(links: string[]|undefined): string|undefined {
  if (!links) {
    return undefined;
  }
  for (const link of links) {
    const youtubeId = getYoutubeVideoIdFromLink(link);
    if (youtubeId !== undefined) {
      return youtubeId;
    }
  }
  return undefined;
}

const MIN_YOUTUBE_VIDEO_ID_LENGTH = 8;
const MAX_YOUTUBE_VIDEO_ID_LENGTH = 12;

const YOUTUBE_ID_CHARS = '0-9a-zA-Z-_';

export function getYoutubeVideoIdFromLink(origUrl: string|undefined): string|undefined {
  if (origUrl === undefined) {
    return undefined;
  }
  if (isValidYoutubeId(origUrl)) {
    return origUrl;
  }
  const url = origUrl.replace('v==', 'v=').replace('v=v=', 'v=').replace('v=watch?', '').replace('&feature=youtu.be', '');
  let lcUrl = url.toLowerCase();
  const yIdx = Math.max(lcUrl.lastIndexOf('youtube.com'), lcUrl.lastIndexOf('youtu.be'));
  if (yIdx < 0) {
    return undefined;
  }
  lcUrl = lcUrl.substring(yIdx);

  let match = new RegExp(`(youtu\\.be/|youtube\\.com)/(embed/|v/|watch\\?v=|watch\\?.+&v=)(([${YOUTUBE_ID_CHARS}]){${MIN_YOUTUBE_VIDEO_ID_LENGTH},}).*`, 'g').exec(lcUrl);
  let groupNumber = 3;
  if (match === null) {
    match = new RegExp(`(youtu\\.be/)(([${YOUTUBE_ID_CHARS}]){${MIN_YOUTUBE_VIDEO_ID_LENGTH},}).*`, 'g').exec(lcUrl);
    groupNumber = 2;
    if (match === null) {
      return undefined;
    }
  }
  let lcResult = match[groupNumber];
  if (!isValidYoutubeId(lcResult)) {
    return undefined;
  }
  let idx = lcUrl.indexOf(lcResult);
  return url.substring(yIdx + idx, yIdx + idx + lcResult.length);
}


export function isValidYoutubeId(id: string): boolean {
  const regex = new RegExp(`^[${YOUTUBE_ID_CHARS}]{${MIN_YOUTUBE_VIDEO_ID_LENGTH},${MAX_YOUTUBE_VIDEO_ID_LENGTH}}`, 'g');
  return regex.exec(id) !== null;
}
