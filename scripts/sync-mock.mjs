// Учебная замена облачной базы для проверки синхронизации на компьютере: хранит прогресс в памяти.
//   node scripts/sync-mock.mjs 5180
// В браузере: localStorage['brezel.sync.url'] = 'http://localhost:5180'
import http from 'node:http';

const port = Number(process.argv[2]) || 5180;
const db = new Map();

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const key = req.url.split('?')[0];
  if (!/^\/brezel\/[0-9a-f]{64}\.json$/.test(key)) { res.writeHead(401); res.end('{"error":"Permission denied"}'); return; }
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'GET') { res.end(db.get(key) || 'null'); return; }
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', () => { db.set(key, body); console.log('PUT', key.slice(8, 16), body.length, 'bytes'); res.end(body); });
}).listen(port, () => console.log('sync mock on', port));
