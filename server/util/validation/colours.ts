// A *very* simple ANSI styling module


let coloursEnabled = false;

function ansiStyle(text: string, code: number): string {
  if (!coloursEnabled) {
    return text;
  }

  return `\x1b[${code}m${text}\x1b[0m`;
}

export function enableColours(enabled: boolean) {
  coloursEnabled = enabled;
}

export const bold = (text: string) => ansiStyle(text, 1);

export const black = (text: string) => ansiStyle(text, 30);

export const red = (text: string) => ansiStyle(text, 31);

export const green = (text: string) => ansiStyle(text, 32);

export const yellow = (text: string) => ansiStyle(text, 33);

export const blue = (text: string) => ansiStyle(text, 34);

export const magenta = (text: string) => ansiStyle(text, 35);

export const cyan = (text: string) => ansiStyle(text, 36);

export const white = (text: string) => ansiStyle(text, 37);

export const bgRed = (text: string) => ansiStyle(text, 41);
