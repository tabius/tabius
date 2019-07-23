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

function put(lc: string, s: string): void {
  TR.set(lc, s);
  TR.set(lc.toUpperCase(), s.charAt(0).toUpperCase() + s.substring(1));
}

export function getTranslitLowerCase(str: string|undefined): string {
  return getTranslitAnyCase(str).toLowerCase();
}

const MASK_CHAR = '-';

export function getTranslitAnyCase(str: string|undefined): string {
  if (str === undefined || str.length === 0) {
    return '';

  }
  let buf = '';
  for (let i = 0; i < str.length; i++) {
    const c = str.charAt(i);
    let trC = TR.get(c);
    if (trC === undefined) {
      const m = c.match(/[a-z0-9]/i);
      trC = m ? m[0] : MASK_CHAR;
    } else {
      if ((trC === 'h' || trC === 'H') && buf.length > 0) { // special handing for h
        const lastC = buf.charAt(buf.length - 1);
        if (lastC === 'k' || lastC === 'z' || lastC === 'c' || lastC === 's' || lastC === 'e' || lastC === 'h') {
          trC = trC === 'h' ? 'kh' : 'Kh';
        }
      }
    }
    if (trC !== MASK_CHAR || (buf.length > 0 && buf.charAt(buf.length - 1) !== MASK_CHAR)) {
      buf += trC;
    }
  }
  if (buf.length > 0 && buf.charAt(buf.length - 1) === MASK_CHAR) {
    buf = buf.substring(buf.length - 1);
  }
  return buf;
}
