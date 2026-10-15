import { createServer } from 'node:http';
import { HOST, PORT } from './config';
import { handleRequest } from './server';
import { ensureEpg } from './epg';

const server = createServer((req, res) => {
  void handleRequest(req, res);
});

server.on('error', (err) => {
  console.error('[iptv-core] erro no servidor:', err.message);
});

server.listen(PORT, HOST, () => {
  console.log(`[iptv-core] servindo em http://${HOST}:${PORT}`);
  ensureEpg();
});
