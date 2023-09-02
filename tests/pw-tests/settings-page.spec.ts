import {expect, test} from '@playwright/test';

test('has title', async ({page}) => {
  await page.goto('http://localhost:12102/settings');
  await expect(page).toHaveTitle('Настройки');
});
