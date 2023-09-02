import {expect, test} from '@playwright/test';

test('has title', async ({page}) => {
  await page.goto('http://localhost:12102/scene');
  await expect(page).toHaveTitle("Песня дня: новая песня с аккордами каждый день");
});
