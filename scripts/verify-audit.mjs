import { createServer } from 'vite';
import { writeFile } from 'node:fs/promises';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { verify } = await server.ssrLoadModule('/src/engine/verification.ts');
  const { normalizeHistory } = await server.ssrLoadModule('/src/engine/history.ts');
  const result = verify();
  const report = {
    fixture: 'Independent one-generation x² example',
    passed: result.passed,
    comparisons: result.checks.length,
    checks: result.checks,
    config: result.config,
    trace: normalizeHistory(result.events),
  };
  await writeFile(
    new URL('../docs/audit-verification.json', import.meta.url),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    `${result.checks.filter((c) => c.passed).length} / ${result.checks.length} independent comparisons passed. Full recorded trace: docs/audit-verification.json`,
  );
  if (!result.passed) process.exitCode = 1;
} finally {
  await server.close();
}
