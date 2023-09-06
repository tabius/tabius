import {expect, test} from '@playwright/test';
import {TEST_ENV} from './tests.env';

const {rootUrl, i18n, collections} = TEST_ENV;

test('has expected content', async ({page}) => {
  await page.goto(`${rootUrl}/catalog`);
  await expect(page).toHaveTitle(i18n.catalogPage.meta.title);
  await expect(page.getByTestId('loaded-content')).toBeVisible({timeout: 15_000});
  await expect(page.locator('.letter-collections').getByTestId(`${collections[0].id}`)).toBeVisible();
});
