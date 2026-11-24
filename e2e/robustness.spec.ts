import { test, expect } from '@playwright/test';
import { defaultConfig } from '../src/problems';
import { readFile } from 'node:fs/promises';
async function openLab(page: import('@playwright/test').Page) {
  await page.goto('/#playground');
  await expect(page.locator('h1')).toContainText('Evolution Playground');
  const setup = page.getByRole('button', { name: 'Toggle experiment setup' });
  if ((await setup.getAttribute('aria-expanded')) === 'false') await setup.click();
  const settings = page.getByRole('button', { name: 'Playback settings' });
  if (await settings.isVisible()) await settings.click();
}
test('playback speed leaves the completed seeded experiment identical', async ({ page }) => {
  await openLab(page);
  await page.getByText('Advanced parameters', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Stop at optimum or stagnation' }).uncheck();
  await page.getByRole('spinbutton', { name: 'Maximum generations', exact: true }).fill('5');
  await page.getByRole('button', { name: 'Create new experiment', exact: true }).last().click();
  await page.getByRole('combobox', { name: 'Playback speed', exact: true }).selectOption('16');
  await page.getByRole('button', { name: 'Play simulation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play simulation', exact: true })).toBeDisabled();
  const fast = await page.locator('.population-table tbody').innerText();
  await page.getByRole('button', { name: 'Reset experiment', exact: true }).click();
  await page.getByRole('button', { name: 'Reset to seed 42' }).click();
  await page.getByRole('combobox', { name: 'Playback speed', exact: true }).selectOption('4');
  await page.getByRole('button', { name: 'Play simulation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play simulation', exact: true })).toBeDisabled();
  expect(await page.locator('.population-table tbody').innerText()).toBe(fast);
});
test('configuration import validates data and settings export returns real JSON', async ({
  page,
}) => {
  await openLab(page);
  const input = page.locator('input[type="file"]');
  await input.setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{broken'),
  });
  await expect(page.getByRole('alert')).toBeVisible();
  const c = { ...defaultConfig, populationSize: 9 };
  await input.setInputFiles({
    name: 'valid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(c)),
  });
  await expect(page.getByRole('spinbutton', { name: 'Population size', exact: true })).toHaveValue(
    '9',
  );
  await page.getByRole('button', { name: 'Create new experiment', exact: true }).last().click();
  await expect(page.locator('.population-table tbody tr')).toHaveCount(9);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('genx-settings.json');
  const settings = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(settings.populationSize).toBe(9);
  const resultsPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export experiment', exact: true }).click();
  const results = JSON.parse(await readFile((await (await resultsPromise).path())!, 'utf8'));
  expect(results.version).toBe(2);
  expect(results.populations[0]).toHaveLength(9);
  expect(results.events[0].population).toBe(0);
  expect(results.config.seed).toBe(42);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.print-report-header')).toBeVisible();
  await expect(page.locator('.print-report-header')).toContainText('populationSize');
});
test('city edits require a new experiment and preserve valid routes', async ({ page }) => {
  await openLab(page);
  await page
    .getByRole('combobox', { name: 'Optimization problem', exact: true })
    .selectOption('tsp');
  await page.getByRole('button', { name: 'Create new experiment', exact: true }).last().click();
  await page.getByRole('button', { name: /Edit cities on map/ }).click();
  await page.getByRole('img', { name: 'Editable city map' }).click({ position: { x: 5, y: 5 } });
  await expect(page.locator('.route-map .city-text')).toHaveCount(9);
  await page.getByRole('button', { name: 'Finish editing map' }).click();
  await expect(page.locator('.route-map .city-text')).toHaveCount(8);
  await page.getByRole('button', { name: 'Create new experiment', exact: true }).last().click();
  await expect(page.locator('.route-map .city-text')).toHaveCount(9);
});
