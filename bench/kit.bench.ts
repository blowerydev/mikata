import { bench, describe } from 'vitest';
import { generateManifestModule } from '../packages/kit/src/generate-manifest';
import { scanRoutes, type RouteManifest } from '../packages/kit/src/scan-routes';

let sink = 0;

function makeRouteFiles(groups: number, pagesPerGroup: number): string[] {
  const files = ['_layout.tsx', 'index.tsx', '404.tsx'];
  for (let group = 0; group < groups; group++) {
    files.push(`section-${group}/_layout.tsx`);
    files.push(`section-${group}/index.tsx`);
    for (let page = 0; page < pagesPerGroup; page++) {
      files.push(`section-${group}/page-${page}.tsx`);
      files.push(`section-${group}/users/[id]/posts/${page}.tsx`);
      if (page % 10 === 0) {
        files.push(`section-${group}/api/page-${page}.ts`);
      }
    }
  }
  return files;
}

const mediumFiles = makeRouteFiles(20, 25);
const largeFiles = makeRouteFiles(40, 50);
const mediumApiFiles = new Set(mediumFiles.filter((file) => file.includes('/api/')));
const largeApiFiles = new Set(largeFiles.filter((file) => file.includes('/api/')));
const mediumManifest = scanRoutes(mediumFiles, { apiFiles: mediumApiFiles });
const largeManifest = scanRoutes(largeFiles, { apiFiles: largeApiFiles });

function countManifest(manifest: RouteManifest): number {
  return manifest.routes.length + manifest.layouts.length + manifest.apiRoutes.length;
}

describe('@mikata/kit', () => {
  bench('scan 1k route files with layouts and API routes', () => {
    const manifest = scanRoutes(mediumFiles, { apiFiles: mediumApiFiles });
    sink = countManifest(manifest);
  });

  bench('scan 4k route files with layouts and API routes', () => {
    const manifest = scanRoutes(largeFiles, { apiFiles: largeApiFiles });
    sink = countManifest(manifest);
  });

  bench('generate manifest module for 1k scanned routes', () => {
    const code = generateManifestModule({
      routesDir: '/app/src/routes',
      manifest: mediumManifest,
      base: '/docs/',
    });
    sink = code.length;
  });

  bench('generate manifest module for 4k scanned routes', () => {
    const code = generateManifestModule({
      routesDir: '/app/src/routes',
      manifest: largeManifest,
      base: '/docs/',
    });
    sink = code.length;
  });
});

void sink;
