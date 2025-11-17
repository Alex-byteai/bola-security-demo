const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = 8081;
const wss = new WebSocket.Server({ port: PORT });

console.log(`🔌 WebSocket server running on port ${PORT}`);

// Vigilar cambios en el archivo de logs
const logFile = path.join(__dirname, 'logs', 'security.log');

wss.on('connection', (ws) => {
  console.log('✅ Cliente conectado al WebSocket');

  // Enviar logs existentes al conectar
  if (fs.existsSync(logFile)) {
    const logs = fs.readFileSync(logFile, 'utf8')
      .split('\n')
      .filter(line => line.trim())
      .slice(-20) // Últimas 20 líneas
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(log => log !== null);

    ws.send(JSON.stringify({ type: 'initial', logs }));
  }

  // Vigilar nuevos logs
  const watcher = fs.watch(logFile, (eventType) => {
    if (eventType === 'change') {
      const logs = fs.readFileSync(logFile, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .slice(-1) // Última línea
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(log => log !== null);

      if (logs.length > 0) {
        ws.send(JSON.stringify({ type: 'new', log: logs[0] }));
      }
    }
  });

  ws.on('close', () => {
    console.log('❌ Cliente desconectado');
    watcher.close();
  });
});

module.exports = wss;