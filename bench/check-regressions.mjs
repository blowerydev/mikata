import { readFileSync } from 'node:fs';

const [baselinePath, currentPath, thresholdArg] = process.argv.slice(2);
const threshold = thresholdArg == null ? 0.35 : Number(thresholdArg);

if (!baselinePath || !currentPath || !Number.isFinite(threshold)) {
  console.error('Usage: node bench/check-regressions.mjs <baseline.json> <current.json> [threshold]');
  process.exit(2);
}

function readReport(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function collectBenchmarks(report) {
  const benchmarks = new Map();

  for (const file of report.files ?? []) {
    for (const group of file.groups ?? []) {
      for (const benchmark of group.benchmarks ?? []) {
        const key = `${group.fullName} > ${benchmark.name}`;
        benchmarks.set(key, benchmark);
      }
    }
  }

  return benchmarks;
}

const baseline = collectBenchmarks(readReport(baselinePath));
const current = collectBenchmarks(readReport(currentPath));
const failures = [];
const missing = [];

for (const [key, baselineBenchmark] of baseline) {
  const currentBenchmark = current.get(key);
  if (!currentBenchmark) {
    missing.push(key);
    continue;
  }

  const baselineHz = Number(baselineBenchmark.hz);
  const currentHz = Number(currentBenchmark.hz);
  if (!Number.isFinite(baselineHz) || !Number.isFinite(currentHz) || baselineHz <= 0) {
    continue;
  }

  const ratio = currentHz / baselineHz;
  if (ratio < 1 - threshold) {
    failures.push({
      key,
      baselineHz,
      currentHz,
      ratio,
    });
  }
}

for (const key of missing) {
  console.warn(`[bench] Missing benchmark in current report: ${key}`);
}

if (failures.length > 0) {
  console.error(`[bench] ${failures.length} benchmark regression(s) exceeded ${(threshold * 100).toFixed(0)}%:`);
  for (const failure of failures) {
    console.error(
      `- ${failure.key}: ${failure.currentHz.toFixed(2)} hz vs ${failure.baselineHz.toFixed(2)} hz ` +
        `(${(failure.ratio * 100).toFixed(1)}% of baseline)`,
    );
  }
  process.exit(1);
}

console.log(`[bench] No benchmark regressed more than ${(threshold * 100).toFixed(0)}%.`);
