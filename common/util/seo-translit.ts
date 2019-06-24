//todo: add tests.

const TR = new Map<string, string>();

put('а', 'a');
put('б', 'b');
put('в', 'v');
put('г', 'g');
put('д', 'd');
put('е', 'e');
put('ё', 'yo');
put('ж', 'zh');
put('з', 'z');
put('и', 'i');
put('й', 'j');
put('к', 'k');
put('л', 'l');
put('м', 'm');
put('н', 'n');
put('о', 'o');
put('п', 'p');
put('р', 'r');
put('с', 's');
put('т', 't');
put('у', 'u');
put('ф', 'f');
put('х', 'h');
put('ц', 'c');
put('ч', 'ch');
put('ш', 'sh');
put('щ', 'shch');
put('ъ', '');
put('ы', 'y');
put('ь', '');
put('э', 'eh');
put('ю', 'yu');
put('я', 'ya');


let MIN_RU = 'A'.charCodeAt(0);

function put(lc: string, s: string): void {
  TR.set(lc, s);
  const uc = lc.toUpperCase();
  TR.set(uc, s.charAt(0).toUpperCase() + s.substring(1));
  TR.set(uc, s);
  MIN_RU = Math.min(Math.min(lc.charCodeAt(0), uc.charCodeAt(0)), MIN_RU);
}


export function getTranslitLowerCase(str: string): string {
  return getTranslitAnyCase(str).toLowerCase();
}

const MASK_CHAR = '-';

export function getTranslitAnyCase(str: string): string {
  if (!str || str.length === 0) {
    return '';

  }
  let buf = '';
  for (let i = 0; i < str.length; i++) {
    let c = str.charAt(i);
    let translatedChar = c.charCodeAt(0) < MIN_RU ? null : TR.get(c);
    if (translatedChar == null) {
      translatedChar = c.match('/[a-z1-9]/i') ? translatedChar : MASK_CHAR;
    } else {
      if ((translatedChar === 'h' || translatedChar === 'H') && buf.length > 0) { // special handing for h
        const lastC = buf.charAt(buf.length - 1);
        if (lastC === 'k' || lastC === 'z' || lastC === 'c' || lastC === 's' || lastC === 'e' || lastC === 'h') {
          translatedChar = translatedChar === 'h' ? 'kh' : 'Kh';
        }
      }
    }
    if (translatedChar !== MASK_CHAR || (buf.length > 0 && buf.charAt(buf.length - 1) != MASK_CHAR)) {
      buf += translatedChar;
    }
  }
  if (buf.length > 0 && buf.charAt(buf.length - 1) === MASK_CHAR) {
    buf = buf.substring(buf.length - 1);
  }
  return buf;
}
