import {keysOf, primitiveType, tryCatch} from './utils';
import {EitherValidationError, error, errorFromException, ErrorResult, success, SuccessResult, ValidationError, ValidationResult} from './validation-result';

export * from './validation-result';
export {enableColours} from './colours';


export type Validator<T> = {
  [key in keyof T]-?: (arg: any) => ValidationResult<T[key]>
};


export type Validated<T> = {
  [key in keyof T]: T[key];
}


export interface ILength {
  length: number;
}


export interface IValidationOptions {
  allowAdditionalProperties?: boolean;
}


export function validate<T>(arg: any, assertion: (arg: any) => ValidationResult<T>): ValidationResult<T> {
  return tryCatch(
      () => assertion(arg),
      (err) => errorFromException(err)
  );
}

export function extendValidator<A, B>(validator1: Validator<A>, validator2: Validator<B>): Validator<A&B>;
export function extendValidator<A, B, C>(validator1: Validator<A>, validator2: Validator<B>, validator3: Validator<C>): Validator<A&B&C>;
export function extendValidator<A, B, C, D>(validator1: Validator<A>, validator2: Validator<B>, validator3: Validator<C>, validator4: Validator<D>): Validator<A&B&C&D>;
export function extendValidator<A, B, C, D, E>(validator1: Validator<A>, validator2: Validator<B>, validator3: Validator<C>, validator4: Validator<D>, validator5: Validator<E>): Validator<A&B&C&D&E>;
export function extendValidator<A, B, C, D, E, F>(validator1: Validator<A>, validator2: Validator<B>, validator3: Validator<C>, validator4: Validator<D>, validator5: Validator<E>, validator6: Validator<F>): Validator<A&B&C&D&E&F>;
export function extendValidator<A, B, C, D, E, F, G>(validator1: Validator<A>, validator2: Validator<B>, validator3: Validator<C>, validator4: Validator<D>, validator5: Validator<E>, validator6: Validator<F>, validator7: Validator<G>): Validator<A&B&C&D&E&F&G>;
export function extendValidator<A, B, C, D, E, F, G, H>(validator1: Validator<A>, validator2: Validator<B>, validator3: Validator<C>, validator4: Validator<D>, validator5: Validator<E>, validator6: Validator<F>, validator7: Validator<G>, validator8: Validator<H>): Validator<A&B&C&D&E&F&G&H>;
export function extendValidator<A, B, C, D, E, F, G, H, I>(validator1: Validator<A>, validator2: Validator<B>, validator3: Validator<C>, validator4: Validator<D>, validator5: Validator<E>, validator6: Validator<F>, validator7: Validator<G>, validator8: Validator<H>, validator9: Validator<I>): Validator<A&B&C&D&E&F&G&H&I>;
export function extendValidator<A, B, C, D, E, F, G, H, I, J>(validator1: Validator<A>, validator2: Validator<B>, validator3: Validator<C>, validator4: Validator<D>, validator5: Validator<E>, validator6: Validator<F>, validator7: Validator<G>, validator8: Validator<H>, validator9: Validator<I>, validator10: Validator<J>): Validator<A&B&C&D&E&F&G&H&I&J>;
export function extendValidator(...validators: Validator<any>[]): Validator<any> {
  return validators.reduce((validator, currentValidator) => ({...validator, ...currentValidator}), {} as Validator<any>);
}


// ASSERTIONS //


export function conformsTo<T>(validator: Validator<T>): (arg: any) => ValidationResult<Validated<T>>;
export function conformsTo<T>(validator: Validator<T>, options: IValidationOptions): (arg: any) => ValidationResult<Validated<T>>;
export function conformsTo<T, U>(validator: Validator<T>, next: (arg: Validated<T>) => ValidationResult<U>): (arg: any) => ValidationResult<U>;
export function conformsTo<T, U>(validator: Validator<T>, options: IValidationOptions, next: (arg: Validated<T>) => ValidationResult<U>): (arg: any) => ValidationResult<U>;
export function conformsTo<T>(validator: Validator<T>, optionsOrNext?: IValidationOptions|((arg: Validated<T>) => ValidationResult<any>), next?: (arg: Validated<T>) => ValidationResult<any>): (arg: any) => ValidationResult<any> {
  return isObject((arg: any) => {
    const options: IValidationOptions = typeof optionsOrNext === 'object' ? optionsOrNext : {};
    const nextAssertion: ((arg: Validated<T>) => any)|undefined = typeof optionsOrNext === 'function' ? optionsOrNext : next;
    const {
      allowAdditionalProperties = true
    } = options;

    const partiallyValidated: { [key in keyof T]?: T[key] } = {};

    const errors: ValidationError[] = keysOf(validator).reduce((errors, key) => {
      const result = tryCatch(
          () => validator[key](arg[key]),
          (err) => errorFromException(err)
      );

      if (!result.success) {
        return errors.concat(result.addPathSegment(typeof key === 'number' || typeof key === 'string' ? key : key.toString()).errors);
      }

      partiallyValidated[key] = result.value;
      return errors;
    }, [] as ValidationError[]);

    if (!allowAdditionalProperties) {
      const additionalProperties = keysOf(arg).filter(key => !validator.hasOwnProperty(key));

      if (additionalProperties.length > 0) {
        errors.push(
            new ValidationError(
                'UNEXPECTED_ADDITIONAL_PROPERTIES',
                `Unexpected additional propert${additionalProperties.length === 1 ? 'y' : 'ies'}: ${additionalProperties.join(', ')}`
            )
        );
      }
    }

    if (errors.length > 0) return new ErrorResult(errors);

    const validated = partiallyValidated as Validated<T>;

    return next ? next(validated) : success(validated);
  });
}


export function optional(): (arg: any) => ValidationResult<any|undefined>;
export function optional<T>(next: (arg: any) => ValidationResult<T>): (arg: any) => ValidationResult<T|undefined>;
export function optional(next?: (arg: any) => ValidationResult<any>): (arg: any) => ValidationResult<any|undefined> {
  return (arg: any) => {
    if (arg === undefined) return success(undefined);
    return next ? next(arg) : success(arg);
  };
}


export function required(): (arg: any) => ValidationResult<any>;
export function required<T>(next: (arg: any) => ValidationResult<T>): (arg: any) => ValidationResult<T>;
export function required(next?: (arg: any) => ValidationResult<any>): (arg: any) => ValidationResult<any> {
  return (arg: any) => {
    if (arg === undefined) {
      return error('REQUIRED', 'Required - the value cannot be undefined');
    }

    return next ? next(arg) : success(arg);
  };
}


export function nullable(): (arg: any) => ValidationResult<any|null>;
export function nullable<T>(next: (arg: any) => ValidationResult<T>): (arg: any) => ValidationResult<T|null>;
export function nullable(next?: (arg: any) => ValidationResult<any>): (arg: any) => ValidationResult<any|null> {
  return (arg: any) => {
    if (arg === null) return success(null);
    return next ? next(arg) : success(arg);
  };
}


export function defaultsTo(def: any): (arg: any) => ValidationResult<any>;
export function defaultsTo<T>(def: any, next: (arg: any) => ValidationResult<T>): (arg: any) => ValidationResult<T>;
export function defaultsTo(def: any, next?: (arg: any) => ValidationResult<any>): (arg: any) => ValidationResult<any> {
  return (arg: any) => {
    if (arg === undefined) arg = def;
    return next ? next(arg) : success(arg);
  };
}


export function onErrorDefaultsTo<T, U>(def: U, next: (arg: T) => ValidationResult<U>): (arg: T) => ValidationResult<U> {
  return (arg: T) => {
    const result = tryCatch(
        () => next(arg),
        (err) => errorFromException(err)
    );

    if (result.success) return result;

    // Ignore error - resort to default
    return success(def);
  };
}


export function isBoolean(): (arg: any) => ValidationResult<boolean>;
export function isBoolean<T = boolean>(next: (arg: boolean) => ValidationResult<T>): (arg: any) => ValidationResult<T>;
export function isBoolean(next?: (arg: boolean) => ValidationResult<any>): (arg: any) => ValidationResult<any> {
  return (arg: any) => {
    if (typeof arg !== 'boolean') return error('NOT_BOOLEAN', `Expected boolean, got ${primitiveType(arg)}`);
    return next ? next(arg) : success(arg);
  };
}


export function isNumber(): (arg: any) => ValidationResult<number>;
export function isNumber<T = number>(next: (arg: number) => ValidationResult<T>): (arg: any) => ValidationResult<T>;
export function isNumber(next?: (arg: number) => any): (arg: any) => ValidationResult<any> {
  return (arg: any) => {
    if (typeof arg !== 'number') return error('NOT_NUMBER', `Expected number, got ${primitiveType(arg)}`);
    return next ? next(arg) : success(arg);
  };
}


export function min(min: number): (arg: number) => ValidationResult<number>;
export function min<T = number>(min: number, next: (arg: number) => ValidationResult<T>): (arg: number) => ValidationResult<T>;
export function min(min: number, next?: (arg: number) => ValidationResult<any>): (arg: number) => ValidationResult<any> {
  return (arg: number) => {
    if (arg < min) return error('LESS_THAN_MIN', `${arg} is less than ${min}`);
    return next ? next(arg) : success(arg);
  };
}


export function max(max: number): (arg: number) => ValidationResult<number>;
export function max<T = number>(max: number, next: (arg: number) => ValidationResult<T>): (arg: number) => ValidationResult<T>;
export function max(max: number, next?: (arg: number) => ValidationResult<any>): (arg: number) => ValidationResult<any> {
  return (arg: number) => {
    if (arg > max) return error('GREATER_THAN_MAX', `${arg} is greater than ${max}`);
    return next ? next(arg) : success(arg);
  };
}


export function isString(): (arg: any) => ValidationResult<string>;
export function isString<T = string>(next: (arg: string) => ValidationResult<T>): (arg: any) => ValidationResult<T>;
export function isString(next?: (arg: any) => ValidationResult<any>): (arg: any) => ValidationResult<any> {
  return (arg: any) => {
    if (typeof arg !== 'string') return error('NOT_STRING', `Expected string, got ${primitiveType(arg)}`);
    return next ? next(arg) : success(arg);
  };
}


export function matches(regex: RegExp): (arg: string) => ValidationResult<string>;
export function matches<T = string>(regex: RegExp, next: (arg: string) => ValidationResult<T>): (arg: string) => ValidationResult<T>;
export function matches(regex: RegExp, next?: (arg: string) => ValidationResult<any>): (arg: string) => ValidationResult<any> {
  return (arg: string) => {
    if (!regex.test(arg)) return error('FAILED_REGEXP', `Failed regular expression ${regex.toString()}`);
    return next ? next(arg) : success(arg);
  };
}


export function minLength<T extends ILength>(min: number): (arg: T) => ValidationResult<T>;
export function minLength<T extends ILength, U = T>(min: number, next: (arg: T) => ValidationResult<U>): (arg: T) => ValidationResult<U>;
export function minLength<T extends ILength>(min: number, next?: (arg: T) => ValidationResult<any>): (arg: T) => ValidationResult<any> {
  return (arg: T) => {
    if (arg.length < min) return error('LESS_THAN_MIN_LENGTH', `Length ${arg.length} is less than ${min}`);
    return next ? next(arg) : success(arg);
  };
}


export function maxLength<T extends ILength>(max: number): (arg: T) => ValidationResult<T>;
export function maxLength<T extends ILength, U = T>(max: number, next: (arg: T) => ValidationResult<U>): (arg: T) => ValidationResult<U>;
export function maxLength<T extends ILength>(max: number, next?: (arg: T) => ValidationResult<any>): (arg: T) => ValidationResult<any> {
  return (arg: T) => {
    if (arg.length > max) return error('GREATER_THAN_MAX_LENGTH', `Length ${arg.length} is greater than ${max}`);
    return next ? next(arg) : success(arg);
  };
}


export function lengthIs<T extends ILength>(length: number): (arg: T) => ValidationResult<T>;
export function lengthIs<T extends ILength, U = T>(length: number, next: (arg: T) => ValidationResult<U>): (arg: T) => ValidationResult<U>;
export function lengthIs<T extends ILength>(length: number, next?: (arg: T) => ValidationResult<any>): (arg: T) => ValidationResult<any> {
  return (arg: T) => {
    if (arg.length !== length) return error('LENGTH_NOT_EQUAL', `Length ${arg.length} is not equal to ${length}`);
    return next ? next(arg) : success(arg);
  };
}


export function isArray(): (arg: any) => ValidationResult<any[]>;
export function isArray<T>(next: (arg: any[]) => ValidationResult<T>): (arg: any) => ValidationResult<T>;
export function isArray(next?: (arg: any[]) => ValidationResult<any>): (arg: any) => ValidationResult<any> {
  return (arg: any) => {
    if (!(arg instanceof Array)) return error('NOT_ARRAY', `Expected array, got ${primitiveType(arg)}`);
    return next ? next(arg) : success(arg);
  };
}


export function eachItem<T>(assertion: (arg: any) => ValidationResult<T>): (arg: any[]) => ValidationResult<T[]>;
export function eachItem<T, U>(assertion: (arg: any) => ValidationResult<T>, next: (arg: T[]) => ValidationResult<U>): (arg: any[]) => ValidationResult<U>;
export function eachItem<T>(assertion: (arg: any) => ValidationResult<T>, next?: (arg: any[]) => ValidationResult<any>): (arg: any[]) => ValidationResult<any> {
  return (arg: any[]) => {
    const results = arg.map((item, index) => tryCatch(
        () => assertion(item),
        (err) => errorFromException(err)
    ));

    if (results.some(ErrorResult.isErrorResult)) {
      return new ErrorResult(
          results
              .map((item, index) => {
                if (!item.success) item.addPathSegment(index);
                return item;
              })
              .filter<ErrorResult>(ErrorResult.isErrorResult)
              .reduce((errors, result) => errors.concat(result.errors), [] as ValidationError[])
      );
    }

    const mapped = (results as SuccessResult<T>[]).map(result => result.value);

    return next ? next(mapped) : success(mapped);
  };
}


export function isObject(): (arg: any) => ValidationResult<any>;
export function isObject<T>(next: (arg: any) => ValidationResult<T>): (arg: any) => ValidationResult<T>;
export function isObject(next?: (arg: any) => ValidationResult<any>): (arg: any) => ValidationResult<any> {
  return (arg: any) => {
    if (typeof arg !== 'object' || arg instanceof Array || arg === null) return error('NOT_OBJECT', `Expected object, got ${primitiveType(arg)}`);
    return next ? next(arg) : success(arg);
  };
}


export function equals<T>(value: T, ...values: T[]): (arg: any) => ValidationResult<T> {
  const vals = [value, ...values];

  return (arg: any) => {
    for (const val of vals) {
      if (val === arg) return success(arg);
    }

    return error('NOT_EQUAL', vals.length === 1 ? `'${arg}' does not equal '${vals[0]}'` : `'${arg}' not one of: ${vals.join(', ')}`);
  };
}


export function isMap(): (arg: any) => ValidationResult<{ [key: string]: any }>;
export function isMap<T>(next: (arg: { [key: string]: any }) => ValidationResult<T>): (arg: any) => ValidationResult<T>;
export function isMap(next?: (arg: any) => ValidationResult<any>): (arg: any) => ValidationResult<any> {
  return isObject((arg: any) => {
    const nonStringKeys = keysOf(arg).filter(key => typeof key !== 'string');

    if (nonStringKeys.length > 0) {
      return error('NOT_STRING_KEY', `Expected string keys, got: ${nonStringKeys.map(key => `${typeof key === 'symbol' ? key.toString() : key} (${primitiveType(arg)})`)}`);
    }

    return next ? next(arg) : success(arg);
  });
}


export function eachValue<T>(assertion: (arg: any) => ValidationResult<T>): (arg: { [key: string]: any }) => ValidationResult<{ [key: string]: T }>;
export function eachValue<T, U>(assertion: (arg: any) => ValidationResult<T>, next: (arg: { [key: string]: T }) => ValidationResult<U>): (arg: {
  [key: string]: any
}) => ValidationResult<U>;
export function eachValue<T>(assertion: (arg: any) => ValidationResult<T>, next?: (arg: { [key: string]: T }) => ValidationResult<any>): (arg: {
  [key: string]: any
}) => ValidationResult<any> {
  return (arg: { [key: string]: any }) => {
    const result = conformsTo(
        Object.keys(arg).reduce(
            (validator, key) => {
              validator[key] = assertion;
              return validator;
            },
            {} as Validator<{ [key: string]: T }>
        )
    )(arg);

    if (result.success && next) return next(result.value);

    return result;
  };
}


export interface IEitherOption<T> {
  description: string;
  assertion: (arg: any) => ValidationResult<T>;
}


export function is<T>(description: string, assertion: (arg: any) => ValidationResult<T>): IEitherOption<T> {
  return {description, assertion};
}


// These overloads are necessary for type safety
export function either<A, B>(option1: IEitherOption<A>, option2: IEitherOption<B>): (arg: any) => ValidationResult<A|B>;
export function either<A, B, C>(option1: IEitherOption<A>, option2: IEitherOption<B>, option3: IEitherOption<C>): (arg: any) => ValidationResult<A|B|C>;
export function either<A, B, C, D>(option1: IEitherOption<A>, option2: IEitherOption<B>, option3: IEitherOption<C>, option4: IEitherOption<D>): (arg: any) => ValidationResult<A|B|C|D>;
export function either<A, B, C, D, E>(option1: IEitherOption<A>, option2: IEitherOption<B>, option3: IEitherOption<C>, option4: IEitherOption<D>, option5: IEitherOption<E>): (arg: any) => ValidationResult<A|B|C|D|E>;
export function either<A, B, C, D, E, F>(option1: IEitherOption<A>, option2: IEitherOption<B>, option3: IEitherOption<C>, option4: IEitherOption<D>, option5: IEitherOption<E>, option6: IEitherOption<F>): (arg: any) => ValidationResult<A|B|C|D|E|F>;
export function either<A, B, C, D, E, F, G>(option1: IEitherOption<A>, option2: IEitherOption<B>, option3: IEitherOption<C>, option4: IEitherOption<D>, option5: IEitherOption<E>, option6: IEitherOption<F>, option7: IEitherOption<G>): (arg: any) => ValidationResult<A|B|C|D|E|F|G>;
export function either<A, B, C, D, E, F, G, H>(option1: IEitherOption<A>, option2: IEitherOption<B>, option3: IEitherOption<C>, option4: IEitherOption<D>, option5: IEitherOption<E>, option6: IEitherOption<F>, option7: IEitherOption<G>, option8: IEitherOption<H>): (arg: any) => ValidationResult<A|B|C|D|E|F|G|H>;
export function either<A, B, C, D, E, F, G, H, I>(option1: IEitherOption<A>, option2: IEitherOption<B>, option3: IEitherOption<C>, option4: IEitherOption<D>, option5: IEitherOption<E>, option6: IEitherOption<F>, option7: IEitherOption<G>, option8: IEitherOption<H>, option9: IEitherOption<I>): (arg: any) => ValidationResult<A|B|C|D|E|F|G|H|I>;
export function either<A, B, C, D, E, F, G, H, I, J>(option1: IEitherOption<A>, option2: IEitherOption<B>, option3: IEitherOption<C>, option4: IEitherOption<D>, option5: IEitherOption<E>, option6: IEitherOption<F>, option7: IEitherOption<G>, option8: IEitherOption<H>, option9: IEitherOption<I>, option10: IEitherOption<J>): (arg: any) => ValidationResult<A|B|C|D|E|F|G|H|I|J>;
export function either<A, B, C, D, E, F, G, H, I, J, K>(option1: IEitherOption<A>, option2: IEitherOption<B>, option3: IEitherOption<C>, option4: IEitherOption<D>, option5: IEitherOption<E>, option6: IEitherOption<F>, option7: IEitherOption<G>, option8: IEitherOption<H>, option9: IEitherOption<I>, option10: IEitherOption<J>, option11: IEitherOption<K>): (arg: any) => ValidationResult<A|B|C|D|E|F|G|H|I|J|K>;
export function either<A, B, C, D, E, F, G, H, I, J, K, L>(option1: IEitherOption<A>, option2: IEitherOption<B>, option3: IEitherOption<C>, option4: IEitherOption<D>, option5: IEitherOption<E>, option6: IEitherOption<F>, option7: IEitherOption<G>, option8: IEitherOption<H>, option9: IEitherOption<I>, option10: IEitherOption<J>, option11: IEitherOption<K>, option12: IEitherOption<L>): (arg: any) => ValidationResult<A|B|C|D|E|F|G|H|I|J|K|L>;
export function either<A, B, C, D, E, F, G, H, I, J, K, L, M>(option1: IEitherOption<A>, option2: IEitherOption<B>, option3: IEitherOption<C>, option4: IEitherOption<D>, option5: IEitherOption<E>, option6: IEitherOption<F>, option7: IEitherOption<G>, option8: IEitherOption<H>, option9: IEitherOption<I>, option10: IEitherOption<J>, option11: IEitherOption<K>, option12: IEitherOption<L>, option13: IEitherOption<M>): (arg: any) => ValidationResult<A|B|C|D|E|F|G|H|I|J|K|L|M>;
export function either<A, B, C, D, E, F, G, H, I, J, K, L, M, N>(option1: IEitherOption<A>, option2: IEitherOption<B>, option3: IEitherOption<C>, option4: IEitherOption<D>, option5: IEitherOption<E>, option6: IEitherOption<F>, option7: IEitherOption<G>, option8: IEitherOption<H>, option9: IEitherOption<I>, option10: IEitherOption<J>, option11: IEitherOption<K>, option12: IEitherOption<L>, option13: IEitherOption<M>, option14: IEitherOption<N>): (arg: any) => ValidationResult<A|B|C|D|E|F|G|H|I|J|K|L|M|N>;
export function either<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(option1: IEitherOption<A>, option2: IEitherOption<B>, option3: IEitherOption<C>, option4: IEitherOption<D>, option5: IEitherOption<E>, option6: IEitherOption<F>, option7: IEitherOption<G>, option8: IEitherOption<H>, option9: IEitherOption<I>, option10: IEitherOption<J>, option11: IEitherOption<K>, option12: IEitherOption<L>, option13: IEitherOption<M>, option14: IEitherOption<N>, option15: IEitherOption<O>): (arg: any) => ValidationResult<A|B|C|D|E|F|G|H|I|J|K|L|M|N|O>;
export function either<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(option1: IEitherOption<A>, option2: IEitherOption<B>, option3: IEitherOption<C>, option4: IEitherOption<D>, option5: IEitherOption<E>, option6: IEitherOption<F>, option7: IEitherOption<G>, option8: IEitherOption<H>, option9: IEitherOption<I>, option10: IEitherOption<J>, option11: IEitherOption<K>, option12: IEitherOption<L>, option13: IEitherOption<M>, option14: IEitherOption<N>, option15: IEitherOption<O>, option16: IEitherOption<P>): (arg: any) => ValidationResult<A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P>;
export function either<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>(option1: IEitherOption<A>, option2: IEitherOption<B>, option3: IEitherOption<C>, option4: IEitherOption<D>, option5: IEitherOption<E>, option6: IEitherOption<F>, option7: IEitherOption<G>, option8: IEitherOption<H>, option9: IEitherOption<I>, option10: IEitherOption<J>, option11: IEitherOption<K>, option12: IEitherOption<L>, option13: IEitherOption<M>, option14: IEitherOption<N>, option15: IEitherOption<O>, option16: IEitherOption<P>, option17: IEitherOption<Q>): (arg: any) => ValidationResult<A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q>;
export function either<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>(option1: IEitherOption<A>, option2: IEitherOption<B>, option3: IEitherOption<C>, option4: IEitherOption<D>, option5: IEitherOption<E>, option6: IEitherOption<F>, option7: IEitherOption<G>, option8: IEitherOption<H>, option9: IEitherOption<I>, option10: IEitherOption<J>, option11: IEitherOption<K>, option12: IEitherOption<L>, option13: IEitherOption<M>, option14: IEitherOption<N>, option15: IEitherOption<O>, option16: IEitherOption<P>, option17: IEitherOption<Q>, option18: IEitherOption<R>): (arg: any) => ValidationResult<A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R>;
export function either<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>(option1: IEitherOption<A>, option2: IEitherOption<B>, option3: IEitherOption<C>, option4: IEitherOption<D>, option5: IEitherOption<E>, option6: IEitherOption<F>, option7: IEitherOption<G>, option8: IEitherOption<H>, option9: IEitherOption<I>, option10: IEitherOption<J>, option11: IEitherOption<K>, option12: IEitherOption<L>, option13: IEitherOption<M>, option14: IEitherOption<N>, option15: IEitherOption<O>, option16: IEitherOption<P>, option17: IEitherOption<Q>, option18: IEitherOption<R>, option19: IEitherOption<S>): (arg: any) => ValidationResult<A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S>;
export function either<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>(option1: IEitherOption<A>, option2: IEitherOption<B>, option3: IEitherOption<C>, option4: IEitherOption<D>, option5: IEitherOption<E>, option6: IEitherOption<F>, option7: IEitherOption<G>, option8: IEitherOption<H>, option9: IEitherOption<I>, option10: IEitherOption<J>, option11: IEitherOption<K>, option12: IEitherOption<L>, option13: IEitherOption<M>, option14: IEitherOption<N>, option15: IEitherOption<O>, option16: IEitherOption<P>, option17: IEitherOption<Q>, option18: IEitherOption<R>, option19: IEitherOption<S>, option20: IEitherOption<T>): (arg: any) => ValidationResult<A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T>;
export function either(...options: Array<IEitherOption<any>>): (arg: any) => any {
  return (arg: any) => {
    const eitherError = new EitherValidationError();

    for (const option of options) {
      const result = tryCatch(
          () => option.assertion(arg),
          (err) => errorFromException(err)
      );

      if (result.success) {
        return result;
      }

      eitherError.errors[option.description] = result.errors;
    }

    return new ErrorResult(eitherError);
  };
}


export function convert<T, U>(func: (arg: T) => U): (arg: T) => ValidationResult<U> {
  return (arg) => {
    return tryCatch(
        () => success(func(arg)),
        (err) => errorFromException(err)
    );
  };
}
