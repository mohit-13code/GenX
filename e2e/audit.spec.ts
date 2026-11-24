import { test, expect, type Page } from '@playwright/test';
import { defaultConfig } from '../src/problems';
import type { Config } from '../src/engine/types';
async function fixture(page: Page, patch: Partial<Config> = {}) {
  const config = {
    ...defaultConfig,
    populationSize: 4,
    elitism: 0,
    tournamentSize: 2,
    maxGenerations: 2,
    earlyStopping: false,
    seed: 0,
    ...patch,
  };
  await page.addInitScript((c) => localStorage.setItem('genx-config', JSON.stringify(c)), config);
  await page.goto('/#playground');
  await expect(page.locator('h1')).toContainText('Evolution Playground');
  return config;
}
async function trace(page: Page) {
  const tab = page.getByRole('button', { name: 'Algorithm trace', exact: true });
  if (await tab.isVisible()) await tab.click();
}
test('tournament table reports enumerated winner probabilities', async ({ page }) => {
  await fixture(page);
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await trace(page);
  await page.getByText('Selection probability table', { exact: true }).click();
  const rows = await page.locator('.probability-detail tbody tr').allTextContents();
  const fitness = await page
    .locator('.probability-detail tbody tr td:nth-child(2)')
    .allTextContents();
  const f = fitness.map((s) => Number(s.replaceAll(',', ''))),
    wins = [0, 0, 0, 0];
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) wins[f[b] > f[a] ? b : a]++;
  const probabilities = await page
    .locator('.probability-detail tbody tr td:nth-child(3)')
    .allTextContents();
  probabilities.forEach((p, i) => expect(Number(p)).toBeCloseTo(wins[i] / 16, 4));
  expect(rows).toHaveLength(4);
  await expect(page.locator('.probability-detail')).toContainText('Actual winner probabilities');
});
test('one-code-point single crossover is truthfully marked skipped', async ({ page }) => {
  await fixture(page, {
    problem: 'phrase',
    target: 'A',
    mutation: 'character',
    crossover: 'single',
    crossoverRate: 1,
    mutationRate: 0,
  });
  for (let i = 0; i < 3; i++)
    await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.locator('.operator-bench .operation-state')).toHaveText('Crossover skipped');
  await trace(page);
  await expect(page.locator('.event-message')).toContainText(
    'one-gene chromosome has no internal cut',
  );
});
test('a feasible zero-value knapsack is recognized as the optimum', async ({ page }) => {
  await fixture(page, {
    problem: 'knapsack',
    capacity: 1,
    items: [
      { name: 'A', weight: 2, value: 0 },
      { name: 'B', weight: 3, value: 0 },
    ],
    earlyStopping: true,
  });
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await trace(page);
  await expect(page.locator('.event-message')).toHaveText('Known discrete optimum reached');
});
test('tiny objectives retain meaningful plot labels and do not stop immediately', async ({
  page,
}) => {
  await fixture(page, {
    domainMax: 1e-6,
    crossoverRate: 0,
    mutationRate: 0,
    earlyStopping: true,
    stagnation: 1,
  });
  await expect(page.locator('.viz-caption').first()).toContainText('OBJECTIVE LANDSCAPE');
  await expect(
    page.locator('.landscape .axis-text').filter({ hasText: 'e-' }).first(),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await trace(page);
  await expect(page.locator('.event-message')).toContainText('Selected chromosome');
});
