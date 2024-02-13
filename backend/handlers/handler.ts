import { Application, NextFunction, Request, Response } from 'express';
import { assertObject, assertTruthy, formatError, ObjectAssertion, truthy, ValueAssertion } from 'assertic';
import { isCollectionMount, paramToArrayOfNumericIds, paramToId } from '@backend/util/validators';
import * as url from 'url';
import { CollectionDbi } from '@backend/db/collection-dbi.service';
import { getApp } from '@backend/backend.module';
import { isUserId } from '@common/util/misc-utils';
import { SongDbi } from '@backend/db/song-dbi.service';
import {
  ApiResponse,
  BAD_REQUEST,
  BAD_REQUEST_STATUS,
  FORBIDDEN,
  FORBIDDEN_STATUS,
  INTERNAL_ERROR,
  INTERNAL_ERROR_STATUS,
  NOT_FOUND,
  NOT_FOUND_STATUS,
  UNAUTHORIZED,
  UNAUTHORIZED_STATUS,
  UrlParameter,
} from '@backend/handlers/protocol';

export interface BaseHandler {
  path: string;
}

export interface RequestContext<RequestBodyType = void> {
  request: RequestBodyType;
  req: Request;
  res: Response;
  userId: string;
  userIdParam: string;
  mount: string;
  id: number;
  ids: number[];
  collectionDbi: CollectionDbi;
  songDbi: SongDbi;
}

export type UrlTokensValidator = Record<string, ValueAssertion<string>>;

/** Openapi allows handlers to return response in the raw form. */
export type ResponseOrValue<ResponseEntity> = Response<ResponseEntity> | ResponseEntity;

export interface GetHandler<ResponseResultType = unknown> extends BaseHandler {
  pathValidator?: UrlTokensValidator;
  queryValidator?: UrlTokensValidator;
  handler: (context: RequestContext) => Promise<ResponseOrValue<ResponseResultType>>;
}

export interface PppHandler<RequestBodyType = unknown, ResponseResultType = unknown> extends BaseHandler {
  pathValidator?: UrlTokensValidator;
  queryValidator?: UrlTokensValidator;
  validator: ObjectAssertion<RequestBodyType>;
  handler: (context: RequestContext<RequestBodyType>) => Promise<ResponseOrValue<ResponseResultType>>;
}

export type RouteRegistrationInfo =
  | { method: 'get'; handler: GetHandler }
  | { method: 'post' | 'put' | 'patch'; handler: PppHandler };

export const mountGet = (app: Application, handler: GetHandler): void => mount(app, { method: 'get', handler });

export const mountPost = <Req, Res>(app: Application, handler: PppHandler<Req, Res>): void =>
  mount(app, { method: 'post', handler: handler as PppHandler });

export const mountPut = <Req, Res>(app: Application, handler: PppHandler<Req, Res>): void =>
  mount(app, { method: 'put', handler: handler as PppHandler });

export function mount(app: Application, { method, handler }: RouteRegistrationInfo): void {
  const pathPrefix = `/api/`;
  const path = `${pathPrefix}${handler.path}`;
  console.log(`${`${method.toUpperCase()}     `.substring(0, 8)} ${path}`);
  app[method](
    path,
    catchRouteErrors(async (req, res) => {
      let result: ResponseOrValue<unknown>;
      validateUrlParameters(req, handler);
      // TODO: check permissions.
      const userId: string | undefined = undefined;
      const requestContext = newRequestContext(undefined, req, res, userId);
      console.log(`${method.toUpperCase()} ${req.path}`);
      switch (method) {
        case 'get':
          result = await runGetHandler(handler, requestContext);
          break;
        case 'patch':
        case 'post':
        case 'put':
          result = await runPppHandler(handler, requestContext);
          break;
      }
      res.send(result);
    }),
  );
}

async function runGetHandler<ResponseResultType>(
  handler: GetHandler<ResponseResultType>,
  requestContext: RequestContextImpl<void>,
): Promise<ResponseOrValue<ResponseResultType>> {
  return await handler.handler(requestContext);
}

async function runPppHandler<RequestBodyType, ResponseResultType>(
  handler: PppHandler<RequestBodyType, ResponseResultType>,
  requestContext: RequestContextImpl<RequestBodyType>,
): Promise<ResponseOrValue<ResponseResultType>> {
  const apiRequest = requestContext.req.body as unknown;
  assertObject(apiRequest, handler.validator, `${BAD_REQUEST}: request body`, { failOnUnknownFields: true });
  requestContext.data.request = requestContext.req.body;
  return await handler.handler(requestContext);
}

function newRequestContext<RequestBodyType>(
  apiRequest: RequestBodyType,
  req: Request,
  res: Response,
  userId: string | undefined,
): RequestContextImpl<RequestBodyType> {
  return new RequestContextImpl<RequestBodyType>(
    // Empty/undefined/null values in the wrapped structure are safe because all access methods are guarded.
    {
      request: apiRequest,
      req,
      res,
      userId,
    },
  );
}

class RequestContextImpl<RequestBodyType> implements RequestContext<RequestBodyType> {
  constructor(readonly data: Pick<RequestContext<RequestBodyType>, 'request' | 'req' | 'res'> & { userId?: string }) {}

  get request(): RequestBodyType {
    return this.data.request;
  }

  get req(): Request {
    return this.data.req;
  }

  get res(): Response {
    return this.data.res;
  }

  get userId(): string {
    return truthy(this.data.userId, 'No "userId" in the context');
  }

  get userIdParam(): string {
    return this.getParameter(UrlParameter.userId);
  }

  get mount(): string {
    return this.getParameter(UrlParameter.mount);
  }

  get id(): number {
    const id = truthy(this.getParameter(UrlParameter.id), 'No "id" in the context');
    return paramToId(id);
  }

  get ids(): number[] {
    const ids = truthy(this.getParameter(UrlParameter.ids), 'No "ids" in the context');
    return paramToArrayOfNumericIds(ids);
  }

  private getParameter(param: UrlParameter): string {
    return truthy(this.data.req.params[param], `No "${param}" in the context`);
  }

  get collectionDbi(): CollectionDbi {
    return getApp().get(CollectionDbi);
  }

  get songDbi(): SongDbi {
    return getApp().get(SongDbi);
  }
}

export type ExpressFunction = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function catchRouteErrors(fn: ExpressFunction): ExpressFunction {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (error) {
      const response = buildErrorResponse(error);
      if (response.statusCode >= 500) {
        console.error(`catchRouteErrors: ${req.path}`, error);
      } else {
        console.log(`catchRouteErrors: ${req.path}`, error);
      }
      res.status(response.statusCode);
      res.send(response);
    }
  };
}

function buildErrorResponse(error: unknown): ApiResponse<void> {
  const errorMessage = typeof error === 'object' ? (error as Error).message : typeof error === 'string' ? error : undefined;
  const statusCode = parseStatusCodeFromErrorMessageToken(errorMessage);
  const message = statusCode === INTERNAL_ERROR_STATUS || !errorMessage ? 'Internal error' : cutErrorMessageToken(errorMessage);
  return { statusCode, message };
}

export function parseErrorTokenFromErrorMessage(errorMessage: string): string {
  if (!errorMessage) return '';
  let errorTokenEndIndex = 0;
  for (; errorTokenEndIndex < errorMessage.length; errorTokenEndIndex++) {
    const c = errorMessage.charAt(errorTokenEndIndex);
    const isAlpha = c >= 'A' && c <= 'Z';
    const isDigit = c >= '0' && c <= '9';
    const isUnderscore = c === '_';
    if (!isAlpha && !isDigit && !isUnderscore) {
      break;
    }
  }
  return errorTokenEndIndex > 1 ? errorMessage.substring(0, errorTokenEndIndex) : '';
}

export function cutErrorMessageToken(message: string): string {
  const errorToken = parseErrorTokenFromErrorMessage(message);
  return errorToken.length > 0 ? message.substring(errorToken.length + 1).trimStart() : message;
}

export function parseStatusCodeFromErrorMessageToken(message: unknown): number {
  if (typeof message !== 'string') return 500;
  const errorToken = parseErrorTokenFromErrorMessage(message) || INTERNAL_ERROR;
  return getStatusCodeByErrorToken(errorToken) || (errorToken.length ? 400 : 500);
}

const statusCodeByErrorToken = new Map<string, number>();
registerStatusCodeByErrorToken(BAD_REQUEST, BAD_REQUEST_STATUS);
registerStatusCodeByErrorToken(UNAUTHORIZED, UNAUTHORIZED_STATUS);
registerStatusCodeByErrorToken(FORBIDDEN, FORBIDDEN_STATUS);
registerStatusCodeByErrorToken(NOT_FOUND, NOT_FOUND_STATUS);

export function registerStatusCodeByErrorToken(errorToken: string, statusCode: number): void {
  assertTruthy(
    errorToken.length > 0 && parseErrorTokenFromErrorMessage(errorToken).length === errorToken.length,
    () => `Bad error token format: ${errorToken}`,
  );
  const currentStatusCode = statusCodeByErrorToken.get(errorToken);
  assertTruthy(
    !currentStatusCode || currentStatusCode === statusCode,
    () =>
      `Attempt to re-register error token to different status code! Token: ${errorToken}, current code: ${currentStatusCode}, new code: ${statusCode}`,
  );
  statusCodeByErrorToken.set(errorToken, statusCode);
}

export function getStatusCodeByErrorToken(errorToken: string): number | undefined {
  return statusCodeByErrorToken.get(errorToken);
}

/** Validates request parameters using global + custom validators.*/
function validateUrlParameters(
  req: Request,
  {
    pathValidator,
    queryValidator,
  }: {
    pathValidator?: UrlTokensValidator;
    queryValidator?: UrlTokensValidator;
  },
): void {
  for (const key in req.params) {
    const value = req.params[key];
    const validator: ValueAssertion<unknown> = pathValidator?.[key] || URL_PARAMETER_VALIDATOR[key as UrlParameter];
    assertTruthy(value, () => `Path parameter has no validator: ${key}`);
    validator(value, BAD_REQUEST);
  }

  const parsedUrl = url.parse(req.url, true);
  for (const key in parsedUrl.query) {
    const value = parsedUrl.query[key];
    const validator: ValueAssertion<unknown> = queryValidator?.[key] || URL_PARAMETER_VALIDATOR[key as UrlParameter];
    assertTruthy(validator, () => `${BAD_REQUEST}: Unknown parameter: ${key}`);
    validator(value, BAD_REQUEST);
  }
}

const assertCollectionMount: ValueAssertion<string> = (value: unknown, context = undefined): asserts value is string => {
  assertTruthy(isCollectionMount(value), () => formatError(context, 'Invalid collection mount:', value));
};

const assertUserId: ValueAssertion<string> = (value: unknown, context = undefined): asserts value is string => {
  assertTruthy(isUserId(value), () => formatError(context, 'Invalid user id:', value));
};

const assertSerializedArrayOfNumericIds: ValueAssertion<string> = (value: unknown, context = undefined): asserts value is string => {
  assertTruthy(typeof value === 'string' && value.length > 0 && !value.split(',').some(v => isNaN(+v)), () =>
    formatError(context, 'Invalid list of ids:', value),
  );
};

const assertSerializedNumericId: ValueAssertion<string> = (value: unknown, context = undefined): asserts value is string => {
  assertTruthy(typeof value === 'string' && +value > 0, () => formatError(context, 'Invalid id:', value));
};

export const URL_PARAMETER_VALIDATOR: Record<UrlParameter, ValueAssertion<unknown>> = {
  [UrlParameter.mount]: assertCollectionMount,
  [UrlParameter.id]: assertSerializedNumericId,
  [UrlParameter.ids]: assertSerializedArrayOfNumericIds,
  [UrlParameter.userId]: assertUserId,
};
