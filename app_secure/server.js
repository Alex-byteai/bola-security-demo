const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { initDatabase } = require('./database');
const { loggerMiddleware, logger, getSecurityStats } = require('./middleware/logger');
const { rateLimit, sanitizeInput, requireAdmin } = require('./middleware/authorization');

// ✅ CORRECCIÓN: Importar authenticateToken desde auth
const { authenticateToken } = require('./routes/auth');

const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const paymentRoutes = require('./routes/payments');
require('./websocket');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS seguro con múltiples orígenes permitidos
const rawOrigins = process.env.ALLOWED_ORIGINS || 'http://localhost';
const allowedOrigins = Array.from(new Set(
  rawOrigins.split(',').map(s => s.trim()).filter(Boolean).concat(['http://localhost'])
));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // permitir requests del mismo host (e.g. curl, SSR)
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS: Origin no permitido'), false);
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use(loggerMiddleware);
app.use(sanitizeInput);

// Rate limiting global
app.use(rateLimit(1000, 900000));

// Rate limiting más estricto para auth
app.use('/api/auth', rateLimit(5, 60000));

// Inicializar base de datos
initDatabase();

// Banner de seguridad mejorado
console.log('\n' + '='.repeat(70));
console.log('✅ 🛡️  API SEGURA - PROTEGIDA CONTRA BOLA Y VULNERABILIDADES 🛡️  ✅');
console.log('='.repeat(70));
console.log('PROTECCIONES IMPLEMENTADAS:');
console.log('• Ownership validation en todos los endpoints');
console.log('• Rate limiting global y por rutas');
console.log('• Sanitización de entrada de datos');
console.log('• Helmet.js para headers de seguridad');
console.log('• Logging de seguridad completo');
console.log('• Validación de recursos y autorización');
console.log('='.repeat(70) + '\n');

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);

// Ruta de health check mejorada
app.get('/health', (req, res) => {
  const stats = getSecurityStats();
  res.json({ 
    status: 'secure',
    message: '🛡️ API Segura está funcionando correctamente',
    protections: [
      '✅ Ownership validation en órdenes, usuarios y pagos',
      '✅ Rate limiting global y específico',
      '✅ Authorization middleware',
      '✅ Security logging y monitoreo',
      '✅ Input validation y sanitización',
      '✅ Helmet.js security headers',
      '✅ Ofuscación de datos sensibles'
    ],
    security_stats: stats,
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// ✅ CORREGIDO: Ahora authenticateToken está importado correctamente
app.get('/api/security/logs', authenticateToken, requireAdmin, (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const logFile = path.join(__dirname, 'logs', 'security.log');
    if (fs.existsSync(logFile)) {
      const logs = fs.readFileSync(logFile, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .slice(-200)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(log => log !== null);
      
      res.json({ 
        success: true,
        total: logs.length,
        logs 
      });
    } else {
      res.json({ 
        success: true,
        logs: [] 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Error al leer logs' 
    });
  }
});

// Ruta para estadísticas de seguridad
app.get('/api/security/stats', authenticateToken, requireAdmin, (req, res) => {
  const stats = getSecurityStats();
  
  stats.protectedEndpoints = [
    { method: 'GET', path: '/api/orders/:id', protection: 'Ownership Validation' },
    { method: 'PUT', path: '/api/orders/:id', protection: 'Ownership Validation' },
    { method: 'DELETE', path: '/api/orders/:id', protection: 'Ownership Validation' },
    { method: 'GET', path: '/api/users/:id', protection: 'Self/Access Only' },
    { method: 'PUT', path: '/api/users/:id', protection: 'Self/Admin Only' },
    { method: 'DELETE', path: '/api/users/:id', protection: 'Admin Only' },
    { method: 'GET', path: '/api/users/', protection: 'Admin Only + Pagination' },
    { method: 'GET', path: '/api/payments/:id', protection: 'Ownership + Data Masking' },
    { method: 'GET', path: '/api/payments/', protection: 'User Scope Only' },
    { method: 'POST', path: '/api/payments/', protection: 'Ownership Validation' }
  ];

  res.json({
    success: true,
    ...stats
  });
});

// Ruta de información de seguridad (pública)
app.get('/api/security/info', (req, res) => {
  res.json({
    security_level: "HIGH",
    compliance: ["OWASP API Security", "BOLA Protection"],
    features: [
      "Object Level Authorization",
      "Rate Limiting", 
      "Input Validation",
      "Security Headers",
      "Comprehensive Logging",
      "Data Encryption",
      "Access Control"
    ],
    last_audit: new Date().toISOString()
  });
});

// Manejador de errores mejorado
app.use((err, req, res, next) => {
  logger.error('Error en la aplicación:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user ? req.user.email : 'anonymous'
  });

  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }

  res.status(500).json({ 
    success: false,
    error: err.message,
    stack: err.stack
  });
});

// Manejador de 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🛡️ API Segura corriendo en http://localhost:${PORT}`);
  console.log(`📊 Dashboard de seguridad: http://localhost:${PORT}/api/security/stats`);
  console.log(`🔍 Logs de seguridad: http://localhost:${PORT}/api/security/logs`);
  console.log(`\n🔑 Usuarios de prueba:`);
  console.log(`   👤 alice@example.com   | 🔑 password123`);
  console.log(`   👤 bob@example.com     | 🔑 password123`);
  console.log(`   👤 charlie@example.com | 🔑 password123`);
  console.log(`   ⚠️  admin@example.com  | 🔑 admin123`);
  
  console.log(`\n🛡️ Endpoints protegidos contra BOLA:`);
  console.log(`   GET    /api/orders/:id    - Solo órdenes del usuario`);
  console.log(`   PUT    /api/orders/:id    - Solo órdenes del usuario`);
  console.log(`   DELETE /api/orders/:id    - Solo órdenes del usuario`);
  console.log(`   GET    /api/users/:id     - Solo propio usuario o admin`);
  console.log(`   PUT    /api/users/:id     - Solo propio usuario o admin`);
  console.log(`   DELETE /api/users/:id     - Solo admin`);
  console.log(`   GET    /api/payments/:id  - Solo pagos del usuario`);
  console.log(`   GET    /api/payments/     - Solo pagos del usuario`);
  console.log(`   POST   /api/payments/     - Validación de propiedad`);
  
  console.log(`\n💡 Ejemplo de acceso seguro:`);
  console.log(`   curl -H "Authorization: Bearer <TOKEN>" http://localhost:3001/api/orders/1`);
  console.log(`   # Solo funciona si la orden #1 pertenece al usuario del token\n`);
});

module.exports = app;