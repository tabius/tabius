export enum UrlParameter {
  mount = 'mount',
  id = 'id',
  ids = 'ids',
  userId = 'userId',
}

export interface ApiResponse<T = unknown> {
  statusCode: number;
  result?: T;
  message?: string;
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
