const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = 8081;
const wss = new WebSocket.Server({ port: PORT });

console.log(`🔌 WebSocket server running on port ${PORT}`);

const logFile = path.join(__dirname, 'logs', 'security.log');

const readJsonLines = (raw = '') => raw
  .split('\n')
  .filter(line => line.trim())
  .map(line => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  })
  .filter(Boolean);

wss.on('connection', (ws) => {
  console.log('✅ Cliente conectado al WebSocket');

  let lastSize = 0;

  if (fs.existsSync(logFile)) {
    const fileContent = fs.readFileSync(logFile, 'utf8');
    const logs = readJsonLines(fileContent).slice(-20);

    if (logs.length) {
      ws.send(JSON.stringify({ type: 'initial', logs }));
    }

    try {
      lastSize = fs.statSync(logFile).size;
    } catch {
      lastSize = fileContent.length;
    }
  }

  const emitNewLines = () => {
    fs.stat(logFile, (err, stats) => {
      if (err || !stats) {
        return;
      }

      const newSize = stats.size;

      if (newSize < lastSize) {
        lastSize = 0;
      }

      if (newSize === lastSize) {
        return;
      }

      const readStream = fs.createReadStream(logFile, { start: lastSize, end: newSize - 1, encoding: 'utf8' });
      let buffer = '';

      readStream.on('data', chunk => {
        buffer += chunk;
      });

      readStream.on('end', () => {
        lastSize = newSize;
        const logs = readJsonLines(buffer);
        logs.forEach(log => {
          ws.send(JSON.stringify({ type: 'new', log }));
        });
      });

      readStream.on('error', () => {
        lastSize = newSize;
      });
    });
  };

  let watcher;
  if (fs.existsSync(logFile)) {
    watcher = fs.watch(logFile, (eventType) => {
      if (eventType === 'change') {
        emitNewLines();
      }
    });
  }

  ws.on('close', () => {
    console.log('❌ Cliente desconectado');
    if (watcher) {
      watcher.close();
    }
  });
});

module.exports = wss;