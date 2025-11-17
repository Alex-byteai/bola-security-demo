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
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'security.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'access.log'),
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
      userRole: req.user ? req.user.role : null,
      action: requestContext.action,
      resource: requestContext.resource,
      module: requestContext.module,
      message: requestContext.action
    };

    // Detectar accesos bloqueados (API segura)
    if (res.statusCode === 403) {
      logData.securityEvent = 'ACCESS_BLOCKED';
      logData.severity = 'HIGH';
      logData.message = '🛡️ Acceso no autorizado bloqueado correctamente';
      
      // Log específico para bloqueos de seguridad
      logger.warn(logData);
    } 
    else if (res.statusCode === 401) {
      logData.securityEvent = 'UNAUTHENTICATED_ACCESS';
      logData.severity = 'MEDIUM';
      logger.warn(logData);
    }
    else if (res.statusCode === 429) {
      logData.securityEvent = 'RATE_LIMIT_BLOCKED';
      logData.severity = 'MEDIUM';
      logger.warn(logData);
    }
    else if (res.statusCode >= 400) {
      logger.warn(logData);
    } else {
      logger.info(logData);
    }

    // Log de acceso separado
    const accessLog = {
      timestamp: logData.timestamp,
      method: logData.method,
      url: logData.url,
      ip: logData.ip,
      statusCode: logData.statusCode,
      responseTime: logData.responseTime,
      user: logData.user
    };
    
    // Usar el logger de acceso para requests exitosos
    if (res.statusCode < 400) {
      const accessLogger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        transports: [
          new winston.transports.File({ 
            filename: path.join(logsDir, 'access.log')
          })
        ]
      });
      accessLogger.info(accessLog);
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
    severity: details.severity || 'MEDIUM',
    ...details
  };

  logger.warn(logEntry);
};

// Función para obtener estadísticas de seguridad
const getSecurityStats = () => {
  try {
    const logFile = path.join(logsDir, 'security.log');
    const accessFile = path.join(logsDir, 'access.log');
    
    let totalSecurityLogs = 0;
    let totalAccessLogs = 0;
    let blockedAttempts = 0;
    let rateLimitBlocks = 0;
    const uniqueUsers = new Set();
    const uniqueIPs = new Set();

    if (fs.existsSync(logFile)) {
      const logs = fs.readFileSync(logFile, 'utf8')
        .split('\n')
        .filter(line => line.trim());
      
      totalSecurityLogs = logs.length;

      logs.forEach(line => {
        try {
          const log = JSON.parse(line);
          if (log.securityEvent === 'ACCESS_BLOCKED') blockedAttempts++;
          if (log.securityEvent === 'RATE_LIMIT_BLOCKED') rateLimitBlocks++;
          if (log.user && log.user !== 'anonymous') uniqueUsers.add(log.user);
          if (log.ip) uniqueIPs.add(log.ip);
        } catch (e) {
          // Ignorar líneas inválidas
        }
      });
    }

    if (fs.existsSync(accessFile)) {
      const logs = fs.readFileSync(accessFile, 'utf8')
        .split('\n')
        .filter(line => line.trim());
      totalAccessLogs = logs.length;
    }

    return {
      totalSecurityLogs,
      totalAccessLogs,
      blockedAttempts,
      rateLimitBlocks,
      uniqueUsers: Array.from(uniqueUsers).length,
      uniqueIPs: Array.from(uniqueIPs).length,
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
  getSecurityStats
};