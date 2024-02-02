const API_URL_PREFIX = 'http://localhost:12100';

export async function expectGet<R>(url: string, statusCode: number, expectedResult: R): Promise<void> {
  const response = await fetch(API_URL_PREFIX + url);
  expect(response.status).toEqual(statusCode);
  expect(await response.json()).toEqual(expectedResult);
}
