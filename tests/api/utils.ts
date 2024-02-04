const API_URL_PREFIX = 'http://localhost:12100';

export type ResultCheckFn<R> = (r: R) => boolean;

export async function expectGet<R>(url: string, statusCode: number, expectedResult: R | ResultCheckFn<R>): Promise<void> {
  const response = await fetch(API_URL_PREFIX + url);
  const result = (await response.json()) as R;
  if (typeof expectedResult === 'function') {
    expect((expectedResult as ResultCheckFn<R>)(result)).toBe(true);
  } else {
    expect(result).toEqual(expectedResult);
  }
  expect(response.status).toEqual(statusCode);
}
