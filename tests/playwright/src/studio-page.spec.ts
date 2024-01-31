import { expect, test } from '@playwright/test';
import { TEST_ENV } from './tests.env';

const { rootUrl, i18n } = TEST_ENV;

test('has expected title', async ({ page }) => {
  await page.goto(`${rootUrl}/studio`);
  await expect(page).toHaveTitle(i18n.studioPage.meta.title);
});
