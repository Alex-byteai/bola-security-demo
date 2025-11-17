const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { initDatabase } = require('./database');
const { loggerMiddleware, logger, getSecurityStats } = require('./middleware/logger');
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const paymentRoutes = require('./routes/payments'); // Nuevo recurso
require('./websocket');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));
app.use(loggerMiddleware);

// Inicializar base de datos
initDatabase();

// Banner de advertencia mejorado
console.log('\n' + '='.repeat(70));
console.log('⚠️  🚨 API VULNERABLE - DEMOSTRACIÓN BOLA - SOLO FINES EDUCATIVOS 🚨 ⚠️');
console.log('='.repeat(70));
console.log('ESTA API CONTIENE VULNERABILIDADES INTENCIONALES:');
console.log('• BOLA (Broken Object Level Authorization)');
console.log('• Exposición de información sensible');
console.log('• Falta de control de acceso');
console.log('='.repeat(70) + '\n');

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes); // Nueva ruta

// Ruta de health check mejorada
app.get('/health', (req, res) => {
  const stats = getSecurityStats();
  res.json({ 
    status: 'vulnerable',
    message: '🔓 API Vulnerable está funcionando - BOLA ACTIVADO',
    vulnerabilities: [
      'BOLA en órdenes (GET, PUT, DELETE)',
      'BOLA en usuarios (GET, PUT, DELETE)',
      'BOLA en pagos (GET, POST)',
      'Exposición de información sensible',
      'Listados completos sin autorización'
    ],
    security_stats: stats,
    timestamp: new Date().toISOString()
  });
});

// Ruta para obtener logs (para el dashboard)
app.get('/api/logs', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const logFile = path.join(__dirname, 'logs', 'security.log');
    if (fs.existsSync(logFile)) {
      const logs = fs.readFileSync(logFile, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .slice(-100) // Últimas 100 líneas
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(log => log !== null);
      
      res.json({ logs });
    } else {
      res.json({ logs: [] });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al leer logs' });
  }
});

// Ruta para obtener logs específicos de BOLA
app.get('/api/logs/bola', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const bolaFile = path.join(__dirname, 'logs', 'bola_attacks.log');
    if (fs.existsSync(bolaFile)) {
      const logs = fs.readFileSync(bolaFile, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(log => log !== null);
      
      res.json({ 
        total_bola_attempts: logs.length,
        logs: logs.slice(-50) // Últimos 50 ataques BOLA
      });
    } else {
      res.json({ logs: [], total_bola_attempts: 0 });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al leer logs BOLA' });
  }
});

// Nueva ruta para estadísticas de seguridad
app.get('/api/security/stats', (req, res) => {
  const stats = getSecurityStats();
  
  // Agregar información de endpoints vulnerables
  stats.vulnerableEndpoints = [
    { method: 'GET', path: '/api/orders/:id', vulnerability: 'BOLA' },
    { method: 'PUT', path: '/api/orders/:id', vulnerability: 'BOLA' },
    { method: 'DELETE', path: '/api/orders/:id', vulnerability: 'BOLA' },
    { method: 'GET', path: '/api/users/:id', vulnerability: 'BOLA' },
    { method: 'PUT', path: '/api/users/:id', vulnerability: 'BOLA' },
    { method: 'DELETE', path: '/api/users/:id', vulnerability: 'BOLA' },
    { method: 'GET', path: '/api/users/', vulnerability: 'Information Exposure' },
    { method: 'GET', path: '/api/payments/:id', vulnerability: 'BOLA + Financial Data' },
    { method: 'GET', path: '/api/payments/', vulnerability: 'Information Exposure' },
    { method: 'POST', path: '/api/payments/', vulnerability: 'BOLA' }
  ];

  res.json(stats);
});

// Ruta de información de la API vulnerable
app.get('/api/vulnerability-info', (req, res) => {
  res.json({
    vulnerability: "BOLA (Broken Object Level Authorization)",
    description: "Los atacantes pueden acceder a recursos que no les pertenecen manipulando IDs",
    impact: "Alto - Exposición de datos sensibles, modificación/eliminación no autorizada",
    exploitation_examples: [
      "GET /api/orders/3 (acceder a orden de otro usuario)",
      "GET /api/users/2 (ver datos de otro usuario)", 
      "PUT /api/orders/1 (modificar orden ajena)",
      "DELETE /api/users/3 (eliminar otro usuario)",
      "GET /api/payments/1 (acceder a datos bancarios)"
    ],
    prevention: [
      "Verificar ownership en cada endpoint",
      "Usar UUIDs en lugar de IDs secuenciales",
      "Implementar middleware de autorización",
      "Principio del menor privilegio"
    ]
  });
});

// Manejador de errores
app.use((err, req, res, next) => {
  logger.error('Error en la aplicación:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: err.message 
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🔓 API Vulnerable BOLA corriendo en http://localhost:${PORT}`);
  console.log(`📊 Dashboard de seguridad disponible en http://localhost:${PORT}/api/security/stats`);
  console.log(`📝 Logs de BOLA en tiempo real: http://localhost:${PORT}/api/logs/bola`);
  console.log(`\n🔑 Usuarios de prueba para explotar BOLA:`);
  console.log(`   📧 alice@example.com     | 🔑 password123`);
  console.log(`   📧 bob@example.com       | 🔑 password123`);
  console.log(`   📧 charlie@example.com   | 🔑 password123`);
  console.log(`   ⚠️  admin@example.com    | 🔑 admin123`);
  
  console.log(`\n🎯 Endpoints vulnerables a BOLA:`);
  console.log(`   GET    /api/orders/:id    - Acceder a órdenes de otros usuarios`);
  console.log(`   PUT    /api/orders/:id    - Modificar órdenes ajenas`);
  console.log(`   DELETE /api/orders/:id    - Eliminar órdenes ajenas`);
  console.log(`   GET    /api/users/:id     - Ver datos de otros usuarios`);
  console.log(`   PUT    /api/users/:id     - Modificar datos de otros usuarios`);
  console.log(`   DELETE /api/users/:id     - Eliminar otros usuarios`);
  console.log(`   GET    /api/payments/:id  - Acceder a datos bancarios ajenos`);
  console.log(`   GET    /api/payments/     - Ver todos los pagos del sistema`);
  console.log(`   POST   /api/payments/     - Crear pagos para otros usuarios\n`);
  
  console.log(`💡 Ejemplo de explotación:`);
  console.log(`   curl -H "Authorization: Bearer <ALICE_TOKEN>" http://localhost:3000/api/orders/3`);
  console.log(`   # Alice (usuario 1) accede a la orden 3 que pertenece a Bob (usuario 2)\n`);
});

module.exports = app;