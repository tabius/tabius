import {expect, test} from '@playwright/test';

test('has title', async ({page}) => {
  await page.goto('http://localhost:12102/catalog');
  await expect(page).toHaveTitle('Каталог: все исполнители и коллекции песен');
});
