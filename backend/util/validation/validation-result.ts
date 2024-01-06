import {concatenateItems, formatEitherValidationErrorMessages, formatErrorResultMessage, formatPath} from './formatting';

export type ValidationResult<T> = SuccessResult<T>|ErrorResult;

export class ValidationError {
  public readonly path: Array<string|number> = [];

  constructor(
      public readonly errorCode: string,
      public readonly message: string,
  ) {
  }

  public addPathSegment(seg: string|number): ValidationError {
    this.path.unshift(seg);
    return this;
  }

  public toString(root: string = '$'): string {
    return `${this.pathString(root)}: ${this.message}`;
  }

  public pathString(root: string = '$'): string {
    return formatPath(root, this.path);
  }
}


export class EitherValidationError extends ValidationError {
  public readonly errors: { [description: string]: ValidationError[] } = {};

  constructor() {
    super('NO_MATCH', 'No match found');
  }

  public toString(root: string = '$'): string {
    const names = concatenateItems(Object.keys(this.errors), 'or');
    return `${this.pathString(root)}: ${this.message} - expected either ${names}.\nThe following assertions failed:\n` + formatEitherValidationErrorMessages(this.errors);
  }
}


export class ErrorResult {
  public readonly success: false = false;

  public readonly errors: ValidationError[];

  constructor(errors: ValidationError|ValidationError[]) {
    if (errors instanceof ValidationError) {
      this.errors = [errors];
    } else {
      this.errors = errors;
    }
  }

  public addPathSegment(seg: string|number): ErrorResult {
    for (const error of this.errors) {
      error.addPathSegment(seg);
    }

    return this;
  }

  public toString(root: string = '$', prefix: string = ''): string {
    return formatErrorResultMessage(prefix, root, this.errors);
  }

  public static isErrorResult(arg: any): arg is ErrorResult {
    return arg instanceof ErrorResult;
  }
}


export interface SuccessResult<T> {
  readonly success: true;
  readonly value: T;
}


export function error(errorCode: string, message: string): ErrorResult {
  return new ErrorResult(new ValidationError(errorCode, message));
}


export function errorFromException(err: any): ErrorResult {
  return new ErrorResult(new ValidationError('UNHANDLED_ERROR', `Unhandled error: ${typeof err === 'object' && err.message || 'Unknown error'}`));
}


export function success<T>(value: T): SuccessResult<T> {
  return {success: true, value};
}
