import { Application, NextFunction, Request, Response } from 'express';
import { assertObject, assertTruthy, ObjectAssertion, truthy, ValueAssertion } from 'assertic';

export enum UrlParameter {
  mount = 'mount',
}

export interface BaseHandler {
  path: string;
}

export interface RequestContext<RequestBodyType = void> {
  request: RequestBodyType;
  req: Request;
  res: Response;
  userId?: string;
  mount?: string;
}

export type UrlTokensValidator = Record<string, ValueAssertion<string>>;

/** Openapi allows handlers to return response in the raw form. */
export type ResponseOrValue<ResponseEntity> = Response<ResponseEntity> | ResponseEntity;

export interface GetHandler<ResponseResultType = unknown> extends BaseHandler {
  pathValidator?: UrlTokensValidator;
  queryValidator?: UrlTokensValidator;
  handler: (context: RequestContext) => Promise<ResponseOrValue<ResponseResultType>>;
}

export interface PostHandler<RequestBodyType = unknown, ResponseResultType = unknown> extends BaseHandler {
  pathValidator?: UrlTokensValidator;
  queryValidator?: UrlTokensValidator;
  validator: ObjectAssertion<RequestBodyType>;
  handler: (context: RequestContext<RequestBodyType>) => Promise<ResponseOrValue<ResponseResultType>>;
}

export type RouteRegistrationInfo = { method: 'get'; handler: GetHandler } | { method: 'post'; handler: PostHandler };

export const mountGet = (app: Application, handler: GetHandler): void => mount(app, { method: 'get', handler });

export const mountPost = <Req, Res>(app: Application, handler: PostHandler<Req, Res>): void =>
  mount(app, { method: 'post', handler: handler as PostHandler });

export function mount(app: Application, { method, handler }: RouteRegistrationInfo): void {
  const pathPrefix = `/`;
  const path = `${pathPrefix}${handler.path}`;
  console.log(`${`${method.toUpperCase()}     `.substring(0, 8)} ${path}`);
  app[method](
    path,
    catchRouteErrors(async (req, res) => {
      let result: ResponseOrValue<unknown>;
      // TODO: validateUrlParameters(req, handler).
      // TODO: check permissions.
      const userId: string | undefined = undefined;
      const requestContext = newRequestContext(undefined, req, res, userId);
      if (method === 'get') {
        result = await runGetHandler(handler, requestContext);
      } else {
        result = await runPostHandler(handler, requestContext);
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

async function runPostHandler<RequestBodyType, ResponseResultType>(
  handler: PostHandler<RequestBodyType, ResponseResultType>,
  requestContext: RequestContextImpl<RequestBodyType>,
): Promise<ResponseOrValue<ResponseResultType>> {
  const apiRequest = requestContext.req.body as unknown;
  assertObject(apiRequest, handler.validator, `${BAD_REQUEST}: request body`, { failOnUnknownFields: true });
  requestContext.data.request = requestContext.req.body;
  return await handler.handler(requestContext);
}

function newRequestContext<RequestBodyType>(
  openapiRequest: RequestBodyType,
  req: Request,
  res: Response,
  userId: string | undefined,
): RequestContextImpl<RequestBodyType> {
  return new RequestContextImpl<RequestBodyType>(
    // Empty/undefined/null values in the wrapped structure are safe because all access methods are guarded.
    {
      request: openapiRequest,
      req,
      res,
      userId,
    },
  );
}

class RequestContextImpl<RequestBodyType> implements RequestContext<RequestBodyType> {
  constructor(readonly data: RequestContext<RequestBodyType>) {}

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

  get mount(): string {
    return this.getParameter(UrlParameter.mount);
  }

  private getParameter(param: UrlParameter): string {
    return truthy(this.data.req.params[param], `No "${param}" in the context`);
  }
}

export type ExpressFunction = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function catchRouteErrors(fn: ExpressFunction): ExpressFunction {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (error) {
      const response = buildErrorResponse(error);
      if (response.status >= 500) {
        console.error(`catchRouteErrors: ${req.path}`, error);
      } else {
        console.log(`catchRouteErrors: ${req.path}`, error);
      }
      res.status(response.status);
      res.send(response);
    }
  };
}

interface TResponse<T> {
  status: number;
  result: T;
}

function buildErrorResponse(error: unknown): TResponse<{ error: string }> {
  const errorMessage = typeof error === 'object' ? (error as Error).message : typeof error === 'string' ? error : undefined;
  const status = parseStatusCodeFromErrorMessageToken(errorMessage);
  const publicErrorMessage = status === INTERNAL_ERROR_STATUS || !errorMessage ? 'Internal error' : errorMessage;
  return { status, result: { error: publicErrorMessage } };
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

export const BAD_REQUEST = 'BAD_REQUEST';
export const BAD_REQUEST_STATUS = 400;

export const UNAUTHORIZED = 'UNAUTHORIZED';
export const UNAUTHORIZED_STATUS = 401;

export const FORBIDDEN = 'FORBIDDEN';
export const FORBIDDEN_STATUS = 403;

export const NOT_FOUND = 'NOT_FOUND';
export const NOT_FOUND_STATUS = 404;

export const INTERNAL_ERROR = 'INTERNAL_ERROR';
export const INTERNAL_ERROR_STATUS = 500;

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
