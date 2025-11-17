const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Crear directorio de logs si no existe
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const consoleFormat = winston.format.printf(({ level, message, ...meta }) => {
  const serialized = Object.keys(meta).length ? JSON.stringify(meta) : '';
  return `${level}: ${message || ''} ${serialized}`.trim();
});

// Configurar Winston
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'security.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'bola_attacks.log'),
      maxsize: 5242880,
      maxFiles: 3
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        consoleFormat
      )
    })
  ]
});

// Función para detectar intentos BOLA
const detectBOLAAttempt = (req, user, resourceOwnerId) => {
  if (user && user.id !== resourceOwnerId) {
    logSecurityEvent('BOLA_ATTEMPT', {
      message: `Intento de acceso no autorizado a recurso`,
      attacker: user.email,
      attackerId: user.id,
      victimId: resourceOwnerId,
      endpoint: req.originalUrl,
      method: req.method,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      severity: 'HIGH'
    });
    return true;
  }
  return false;
};

const buildRequestContext = (req) => {
  const cleanPath = (req.originalUrl || '/').split('?')[0];
  const segments = cleanPath.split('/').filter(Boolean);
  const moduleName = segments[1] || segments[0] || 'root';
  const action = `${req.method || 'REQUEST'} ${cleanPath}`.trim();

  return {
    action,
    resource: cleanPath,
    module: moduleName,
  };
};

// Middleware para logging de seguridad
const loggerMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Capturar la respuesta
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend;
    
    const responseTime = Date.now() - startTime;
    const requestContext = buildRequestContext(req);
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      user: req.user ? req.user.email : 'anonymous',
      userId: req.user ? req.user.id : null,
      action: requestContext.action,
      resource: requestContext.resource,
      module: requestContext.module,
      message: requestContext.action
    };

    // Detectar posibles ataques BOLA en órdenes
    if (req.originalUrl.includes('/orders/') && req.method === 'GET') {
      const orderId = req.params.id;
      logData.securityEvent = 'ORDER_ACCESS_ATTEMPT';
      logData.orderId = orderId;
      logData.requestedBy = req.user ? req.user.id : 'unauthenticated';
      
      // Si el código de estado es 200, podría ser un acceso exitoso
      if (res.statusCode === 200) {
        logData.severity = 'WARNING';
        logData.message = `Usuario ${logData.user} accedió a la orden #${orderId}`;
      }
    }

    // Detectar BOLA en usuarios
    if (req.originalUrl.includes('/users/') && req.method === 'GET') {
      const userId = req.params.id;
      logData.securityEvent = 'USER_DATA_ACCESS_ATTEMPT';
      logData.targetUserId = userId;
      
      if (res.statusCode === 200 && req.user && parseInt(userId) !== req.user.id) {
        logData.severity = 'MEDIUM';
        logData.message = `Usuario ${logData.user} accedió a datos del usuario #${userId}`;
      }
    }

    // Log diferente según el código de estado
    if (res.statusCode >= 400) {
      logger.warn(logData);
    } else {
      logger.info(logData);
    }

    return originalSend.call(this, data);
  };

  next();
};

// Función para registrar eventos de seguridad críticos
const logSecurityEvent = (event, details) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: 'SECURITY_EVENT',
    event,
    severity: 'HIGH',
    ...details
  };

  logger.warn(logEntry);

  // Log específico para ataques BOLA
  if (event.includes('BOLA')) {
    const bolaLogger = winston.createLogger({
      level: 'warn',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ 
          filename: path.join(logsDir, 'bola_attacks.log')
        })
      ]
    });
    bolaLogger.warn(logEntry);
  }
};

// Función para obtener estadísticas de seguridad
const getSecurityStats = () => {
  try {
    const logFile = path.join(logsDir, 'security.log');
    const bolaFile = path.join(logsDir, 'bola_attacks.log');
    
    let totalLogs = 0;
    let bolaAttempts = 0;
    let successfulExploits = 0;
    const uniqueAttackers = new Set();

    if (fs.existsSync(logFile)) {
      const logs = fs.readFileSync(logFile, 'utf8')
        .split('\n')
        .filter(line => line.trim());
      
      totalLogs = logs.length;

      logs.forEach(line => {
        try {
          const log = JSON.parse(line);
          if (log.event && log.event.includes('BOLA')) {
            bolaAttempts++;
            if (log.attacker) uniqueAttackers.add(log.attacker);
          }
          if (log.securityEvent === 'ORDER_ACCESS_ATTEMPT' && log.statusCode === 200) {
            successfulExploits++;
          }
        } catch (e) {
          // Ignorar líneas inválidas
        }
      });
    }

    return {
      totalLogs,
      bolaAttempts,
      successfulExploits,
      uniqueAttackers: Array.from(uniqueAttackers).length,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    return { error: 'No se pudieron calcular estadísticas' };
  }
};

module.exports = { 
  logger, 
  loggerMiddleware, 
  logSecurityEvent, 
  detectBOLAAttempt,
  getSecurityStats 
};