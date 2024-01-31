import { expect, test } from '@playwright/test';
import { TEST_ENV } from './tests.env';

const { rootUrl, i18n, collections } = TEST_ENV;

test('has expected content', async ({ page }) => {
  const collection = collections[0];
  const song = collection.songs[0];
  await page.goto(`${rootUrl}/song/${collection.mount}/${song.mount}`);
  const titlePrefix = `${song.name}, ${collection.name} | `;
  await expect(page).toHaveTitle(`${titlePrefix}${i18n.songPage.titleSuffix(titlePrefix)}`);
});
