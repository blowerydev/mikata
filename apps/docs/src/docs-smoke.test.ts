import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sections } from './sections';

const srcDir = dirname(fileURLToPath(import.meta.url));
const routesDir = join(srcDir, 'routes');
const sectionNames = new Set<string>(sections);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function routePathForFile(file: string): string {
  const route = relative(routesDir, file)
    .split(sep)
    .join('/')
    .replace(/\.tsx$/, '')
    .replace(/\/index$/, '');

  return route === 'index' ? '/' : `/${route}`;
}

describe('docs route smoke checks', () => {
  const routeFiles = walk(routesDir).filter((file) => file.endsWith('.tsx'));
  const routeSources = routeFiles.map((file) => ({
    file,
    source: readFileSync(file, 'utf8'),
  }));

  it('does not ship placeholder routes', () => {
    const offenders = routeSources
      .filter(({ source }) =>
        /SkeletonPage|Documentation for this page is in progress|Package documentation is in progress/.test(
          source,
        ),
      )
      .map(({ file }) => relative(srcDir, file));

    expect(offenders).toEqual([]);
  });

  it('keeps sidebar nav entries on known sections and routable paths', () => {
    const concreteRoutes = new Set(
      routeFiles
        .map(routePathForFile)
        .filter((route) => !route.includes('[')),
    );
    const hasPackageDynamicRoute = routeFiles.some((file) =>
      routePathForFile(file) === '/packages/[package]',
    );
    const problems: string[] = [];

    for (const { file, source } of routeSources) {
      const navMatch = source.match(/export const nav\s*=\s*([\s\S]*?);/);
      if (!navMatch) continue;

      const label = relative(srcDir, file);
      const navSource = navMatch[1];
      const sectionsInFile = [...navSource.matchAll(/section:\s*['"]([^'"]+)['"]/g)].map(
        (match) => match[1],
      );
      const pathsInFile = [...navSource.matchAll(/path:\s*['"]([^'"]+)['"]/g)].map(
        (match) => match[1],
      );

      for (const section of sectionsInFile) {
        if (!sectionNames.has(section)) {
          problems.push(`${label} uses unknown nav section "${section}"`);
        }
      }

      for (const path of pathsInFile) {
        const isGeneratedPackagePath =
          hasPackageDynamicRoute && path.startsWith('/packages/');
        if (!concreteRoutes.has(path) && !isGeneratedPackagePath) {
          problems.push(`${label} declares nav path "${path}" without a route`);
        }
      }
    }

    expect(problems).toEqual([]);
  });
});
