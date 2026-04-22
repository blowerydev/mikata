import { createServer } from 'node:http';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequestHandler } from '@mikata/kit/adapter-node';
import * as serverEntry from './dist/server/entry-server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 3000;

const handler = createRequestHandler({
  clientDir: path.join(__dirname, 'dist/client'),
  serverEntry,
});

createServer(handler).listen(port, () => {
  console.log(`[mikata] listening on http://localhost:${port}`);
});
