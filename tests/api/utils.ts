const API_URL_PREFIX = 'http://localhost:12100';

export type ResultCheckFn<R> = (r: R) => boolean;

async function checkResponse<Res>(
  response: Response,
  expectedResult: Res | ResultCheckFn<Res>,
  expectedStatusCode: number,
): Promise<void> {
  const result = (await response.json()) as Res;
  if (typeof expectedResult === 'function') {
    const fn = expectedResult as ResultCheckFn<Res>;
    expect(fn(result)).toBe(true);
  } else {
    expect(result).toEqual(expectedResult);
  }
  expect(response.status).toEqual(expectedStatusCode);
}

export async function expectGet<Res>(
  url: string,
  expectedStatusCode: number,
  expectedResult: Res | ResultCheckFn<Res>,
): Promise<void> {
  const response = await fetch(API_URL_PREFIX + url);
  await checkResponse(response, expectedResult, expectedStatusCode);
}

export async function expectPut<Req, Res>(
  url: string,
  body: Req,
  expectedStatusCode: number,
  expectedResult: Res | ResultCheckFn<Res>,
): Promise<void> {
  const response = await fetch(API_URL_PREFIX + url, { method: 'put', body: JSON.stringify(body) });
  await checkResponse(response, expectedResult, expectedStatusCode);
}
