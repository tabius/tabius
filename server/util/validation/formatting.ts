import {bgRed, bold, cyan, magenta, red, white, yellow,} from './colours';
import {ValidationError} from './validation-result';

export function keysOf<T>(arg: T): Array<keyof T> {
  if (typeof arg !== 'object') return [];

  const keys: Array<keyof T> = [];

  for (const key in arg) {
    keys.push(key);
  }

  return keys;
}

export function repeat(text: string, count: number): string {
  let result = '';

  for (let i = 0; i < count; i++) {
    result += text;
  }

  return result;
}


export function increaseIndent(text: string, indent: number): string {
  const indentPadding = repeat(' ', indent);
  return indentPadding + text.split('\n').join('\n' + indentPadding);
}


export function pluralise(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}


export function formatPath(root: string, path: Array<string|number>): string {
  return magenta(root) + path
      .map(component => {
        if (typeof component === 'number') {
          return yellow('[') + red(`${component}`) + yellow(']');
        } else if (/^[$a-z_][$a-z_0-9]*$/i.test(component)) {
          return yellow('.') + cyan(component);
        } else {
          return yellow('[') + red(`'${component.replace('\\', '\\\\').replace('\'', '\\\'')}'`) + yellow(']');
        }
      })
      .join('');
}


export function formatErrorResultMessage(prefix: string, root: string, errors: ValidationError[]): string {
  return white(bgRed(bold(`${prefix}${errors.length} validation error${errors.length === 1 ? '' : 's'}:`))) + '\n' +
      errors.map(error => increaseIndent(error.toString(root), 4)).join('\n');
}


export function formatEitherValidationErrorMessages(errorsPerType: { [description: string]: ValidationError[] }): string {
  return keysOf(errorsPerType)
      .map(desc => {
        const errors = errorsPerType[desc];

        return increaseIndent(
            bold(red(`Not ${desc}, due to ${pluralise(errors.length, 'validation error', 'validation errors')}:`)) + '\n' +
            errors.map(error => increaseIndent(error.toString(), 4)).join('\n'),
            4
        );
      })
      .join('\n');
}


export function concatenateItems(items: string[], conjunction: string = 'and') {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;

  return `${items.slice(0, items.length - 1).join(', ')}, ${conjunction} ${items[items.length - 1]}`;
}
