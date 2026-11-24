import { test, expect } from '@playwright/test';
test('responsive workspace gives the simulation priority and preserves state across views', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#playground');
  await expect(page.locator('.landscape')).toBeVisible();
  if (info.project.name === 'desktop') {
    const indicator = await page.locator('.nav-indicator').boundingBox(),
      active = await page
        .getByRole('navigation')
        .getByRole('link', { name: 'Playground', exact: true })
        .boundingBox();
    expect(indicator!.x).toBeGreaterThanOrEqual(active!.x);
    expect(indicator!.x + indicator!.width).toBeLessThanOrEqual(active!.x + active!.width + 1);
  }
  await page.evaluate(() => document.fonts.ready);
  const setup = page.getByRole('button', { name: 'Toggle experiment setup' });
  await expect(setup).toHaveAttribute(
    'aria-expanded',
    info.project.name === 'mobile' ? 'false' : 'true',
  );
  const before = await page.locator('.metric>strong').allTextContents();
  await page.getByRole('button', { name: 'Population', exact: true }).click();
  await expect(page.locator('.population-panel')).toBeVisible();
  await expect(page.locator('.population-table tbody tr')).toHaveCount(20);
  await page.getByRole('button', { name: 'Algorithm trace', exact: true }).click();
  await expect(page.locator('.event-message')).toBeVisible();
  await page.getByRole('button', { name: 'Simulation', exact: true }).click();
  await expect(page.locator('.visualization-panel')).toBeVisible();
  expect(await page.locator('.metric>strong').allTextContents()).toEqual(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.getByRole('heading', { name: 'Evolution Playground.' }).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `docs/screenshots/redesign-lab-${info.project.name}.png`,
    fullPage: false,
  });
  expect(errors).toEqual([]);
});
test('animated workbench displays actual crossover and mutation, including the before version', async ({
  page,
}, info) => {
  await page.goto('/#playground');
  const setup = page.getByRole('button', { name: 'Toggle experiment setup' });
  if ((await setup.getAttribute('aria-expanded')) === 'false') await setup.click();
  await page.getByRole('spinbutton', { name: 'Crossover probability', exact: true }).fill('1');
  await page.getByRole('spinbutton', { name: 'Mutation probability', exact: true }).fill('1');
  await page.getByRole('button', { name: 'Create new experiment', exact: true }).last().click();
  if (info.project.name === 'mobile') await setup.click();
  for (let i = 0; i < 3; i++)
    await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.locator('.operator-bench')).toContainText('Recombining the next generation');
  await expect(page.locator('.bench-chromosome')).toHaveCount(4);
  expect(await page.locator('.bench-child .gene-cut').count()).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.locator('.bench-child .gene-mutated')).toHaveCount(10);
  const before = await page
    .locator('.bench-chromosome:not(.bench-child)')
    .first()
    .locator('.gene-cell>span')
    .allTextContents();
  await page.locator('.bench-chromosome:not(.bench-child)').first().getByRole('button').click();
  await expect(page.getByRole('dialog', { name: 'DNA Microscope' })).toBeVisible();
  expect(await page.locator('.inspector-genes>div>span').allTextContents()).toEqual(before);
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await page.locator('.operator-bench').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `docs/screenshots/redesign-operators-${info.project.name}.png`,
    fullPage: false,
  });
});
test('small phone, tablet and compact desktop layouts keep controls inside the viewport', async ({
  page,
}, info) => {
  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['home', 'playground', 'battle']) {
      await page.goto(`/#${route}`);
      await expect(page.locator('h1')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
      if (route === 'playground') {
        const box = await page.locator('.playback').boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      }
    }
  }
  await page.goto('/#home');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `docs/screenshots/redesign-light-${info.project.name}.png`,
    fullPage: true,
  });
});
