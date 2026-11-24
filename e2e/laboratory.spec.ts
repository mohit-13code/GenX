import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
async function open(page: Page, path = '#playground') {
  await page.goto(`/${path}`);
  await expect(page.locator('h1')).toBeVisible();
  if (path === '#playground') {
    const setup = page.getByRole('button', { name: 'Toggle experiment setup' });
    if ((await setup.getAttribute('aria-expanded')) === 'false') await setup.click();
    const settings = page.getByRole('button', { name: 'Playback settings' });
    if (await settings.isVisible()) await settings.click();
  }
}
async function advanced(page: Page) {
  await page.getByText('Advanced parameters', { exact: true }).click();
}
async function noEarlyStop(page: Page) {
  await advanced(page);
  await page.getByRole('checkbox', { name: 'Stop at optimum or stagnation' }).uncheck();
  await page.getByRole('button', { name: 'Create new experiment', exact: true }).last().click();
}
async function generation(page: Page) {
  return (await page.locator('.timeline-row').innerText()).match(/GEN\s+(\d+)/)?.[1];
}
test('home, navigation and live demonstration', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page, '');
  await expect(page.getByRole('heading', { name: /Don’t just learn/ })).toBeVisible();
  await page.getByRole('button', { name: 'Evolve once' }).click();
  await expect(page.locator('.demo-metrics')).toContainText('001');
  await mkdir('docs/screenshots', { recursive: true });
  await page.screenshot({ path: `docs/screenshots/home-${info.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Start evolving', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Evolution Playground.' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('parameters remain draft until a new experiment is applied', async ({ page }) => {
  await open(page);
  await page.getByRole('spinbutton', { name: 'Population size', exact: true }).fill('7');
  await expect(page.locator('.draft-banner')).toBeVisible();
  await page.getByRole('button', { name: 'Create new experiment', exact: true }).last().click();
  await expect(page.locator('.population-table tbody tr')).toHaveCount(7);
  await page.getByRole('spinbutton', { name: 'Population size', exact: true }).fill('1');
  await page.getByRole('button', { name: 'Create new experiment', exact: true }).last().click();
  await expect(page.getByRole('alert')).toContainText('populationSize');
  await expect(page.locator('.population-table tbody tr')).toHaveCount(7);
});
test('play, pause, micro-step, reversible history, generations and reset', async ({
  page,
}, info) => {
  await open(page);
  await noEarlyStop(page);
  const initial = await page.locator('.population-table tbody').innerText();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.locator('.stage-title h3')).toHaveText('Select');
  await page.getByRole('button', { name: 'Next generation', exact: true }).click();
  expect(await generation(page)).toBe('001');
  const first = await page.locator('.population-table tbody').innerText();
  await page.getByRole('button', { name: 'Previous generation', exact: true }).click();
  expect(await generation(page)).toBe('000');
  await page.getByRole('button', { name: 'Next generation', exact: true }).click();
  expect(await page.locator('.population-table tbody').innerText()).toBe(first);
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  const trace = await page.locator('.event-message').innerText();
  await page.getByRole('button', { name: 'Previous step', exact: true }).click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  expect(await page.locator('.event-message').innerText()).toBe(trace);
  await page.getByRole('combobox', { name: 'Playback speed', exact: true }).selectOption('4');
  await page.getByRole('button', { name: 'Play simulation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause simulation' })).toBeVisible();
  await expect.poll(async () => Number(await generation(page))).toBeGreaterThan(1);
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  const paused = await page.locator('.timeline-row').innerText();
  await page.waitForTimeout(300);
  expect(await page.locator('.timeline-row').innerText()).toBe(paused);
  await page.getByRole('button', { name: 'Reset experiment', exact: true }).click();
  await page.getByRole('button', { name: 'Reset to seed 42' }).click();
  expect(await page.locator('.population-table tbody').innerText()).toBe(initial);
  await page.screenshot({
    path: `docs/screenshots/playground-${info.project.name}.png`,
    fullPage: true,
  });
  await page.locator('.visualization-panel').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `docs/screenshots/lab-preview-${info.project.name}.png`,
    fullPage: false,
  });
});
test('all five problems compute and render with compatible operators', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page);
  for (const problem of ['tsp', 'knapsack', 'queens', 'phrase', 'function']) {
    await page
      .getByRole('combobox', { name: 'Optimization problem', exact: true })
      .selectOption(problem);
    await page.getByRole('button', { name: 'Create new experiment', exact: true }).last().click();
    await expect(page.locator('.population-table tbody tr')).toHaveCount(20);
    await page.getByRole('button', { name: 'Next generation', exact: true }).click();
    await expect(page.locator('.visualization-panel')).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test('DNA inspector and recorded ancestry are usable', async ({ page }) => {
  await open(page);
  await noEarlyStop(page);
  await page.getByRole('button', { name: 'Next generation', exact: true }).click();
  await page.getByRole('button', { name: 'Population', exact: true }).click();
  await page
    .getByRole('button', { name: /Open chromosome inspector/ })
    .first()
    .click();
  await expect(page.getByRole('dialog', { name: 'DNA Microscope' })).toBeVisible();
  await expect(page.getByText('Selection fitness ↑', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Recorded ancestry' }).click();
  await expect(
    page.getByRole('img', {
      name: 'Exact recorded parent links through two ancestral generations',
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('verification checks the prescribed independent numerical example', async ({ page }, info) => {
  await open(page, '#verification');
  await page.getByRole('button', { name: 'Run verification' }).click();
  await expect(page.getByRole('heading', { name: 'All checkpoints match' })).toBeVisible();
  await expect(page.getByText('29 / 29 independent comparisons passed.')).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/verification-${info.project.name}.png`,
    fullPage: true,
  });
});
test('synchronized battle and evaluation-axis comparison', async ({ page }) => {
  await open(page, '#battle');
  await page.getByRole('button', { name: 'Step both' }).click();
  await expect(page.locator('.battle-grid')).toContainText('GEN 1');
  await page.getByRole('button', { name: 'Run battle' }).click();
  await expect(page.getByRole('button', { name: 'Pause battle' })).toBeVisible();
  await page.getByRole('button', { name: 'Pause battle' }).click();
  const generations = await page.locator('.battle-panel .panel-heading .badge').allTextContents();
  expect(generations[0]).toBe(generations[1]);
  await page.getByRole('combobox', { name: 'Comparison axis' }).selectOption('evaluations');
  await page.getByRole('spinbutton', { name: 'Mutation A', exact: true }).fill('0.5');
  await expect(page.getByRole('button', { name: 'Run battle' })).toBeDisabled();
  await page.getByRole('button', { name: 'Apply configurations' }).click();
  await expect(page.getByRole('button', { name: 'Run battle' })).toBeEnabled();
});
test('manual prediction executes the same operators and fitness function', async ({ page }) => {
  await open(page, '#learn');
  await page.getByRole('spinbutton', { name: 'Predicted fitness' }).fill('144');
  await page.getByRole('button', { name: 'Reveal computed result' }).click();
  await expect(page.getByText('Correct prediction', { exact: true })).toBeVisible();
  await expect(page.locator('.prediction-result')).toContainText('01100 → x = 12 → f(x) = 144');
  await page.getByRole('button', { name: 'Toggle mutation at gene 5' }).click();
  await page.getByRole('spinbutton', { name: 'Predicted fitness' }).fill('169');
  await page.getByRole('button', { name: 'Reveal computed result' }).click();
  await expect(page.locator('.prediction-result')).toContainText('f(x) = 169');
});
test('responsive layouts, themes and all navigation routes', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  for (const route of ['home', 'playground', 'verification', 'battle', 'learn', 'about']) {
    await open(page, `#${route}`);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
  }
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.screenshot({
    path: `docs/screenshots/light-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  if (info.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    await page.getByRole('navigation').getByRole('link', { name: 'Learn', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Learn by evolving.' })).toBeVisible();
  }
  expect(errors).toEqual([]);
});
