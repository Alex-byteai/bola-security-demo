const { db } = require('../database');
const { logSecurityEvent } = require('./logger');

/**
 * Middleware para verificar que un usuario tiene permiso para acceder a un recurso
 * @param {string} resourceType - Tipo de recurso (order, user, payment, etc.)
 */
const checkOwnership = (resourceType) => {
  return (req, res, next) => {
    const resourceId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Si es admin, permitir acceso (con logging)
    if (userRole === 'admin') {
      logSecurityEvent('ADMIN_ACCESS_GRANTED', {
        adminId: userId,
        adminEmail: req.user.email,
        resourceType: resourceType,
        resourceId: resourceId,
        severity: 'LOW'
      });
      return next();
    }

    let query = '';
    let queryParams = [];
    
    switch(resourceType) {
      case 'order':
        query = 'SELECT user_id FROM orders WHERE id = ?';
        queryParams = [resourceId];
        break;
      case 'user':
        // Para recursos de usuario, verificar que sea el mismo usuario
        if (parseInt(resourceId) !== userId) {
          logSecurityEvent('UNAUTHORIZED_USER_ACCESS', {
            userId: userId,
            userEmail: req.user.email,
            attemptedUserId: resourceId,
            severity: 'HIGH'
          });
          return res.status(403).json({ 
            success: false,
            error: 'No tienes permiso para acceder a este recurso' 
          });
        }
        return next();
      case 'payment':
        query = 'SELECT user_id FROM payments WHERE id = ?';
        queryParams = [resourceId];
        break;
      default:
        return res.status(400).json({ 
          success: false,
          error: 'Tipo de recurso no válido' 
        });
    }

    db.get(query, queryParams, (err, result) => {
      if (err) {
        return res.status(500).json({ 
          success: false,
          error: 'Error en el servidor' 
        });
      }

      if (!result) {
        return res.status(404).json({ 
          success: false,
          error: 'Recurso no encontrado' 
        });
      }

      // Verificar ownership
      if (result.user_id !== userId) {
        logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
          message: '🛡️ Intento de acceso no autorizado bloqueado',
          userId: userId,
          userEmail: req.user.email,
          resourceType: resourceType,
          resourceId: resourceId,
          ownerId: result.user_id,
          severity: 'HIGH'
        });

        return res.status(403).json({ 
          success: false,
          error: 'No tienes permiso para acceder a este recurso' 
        });
      }

      // Si es el propietario, permitir acceso
      next();
    });
  };
};

/**
 * Middleware para verificar que el usuario tiene rol de admin
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    logSecurityEvent('ADMIN_ACCESS_DENIED', {
      userId: req.user.id,
      userEmail: req.user.email,
      attemptedRoute: req.originalUrl,
      userRole: req.user.role,
      severity: 'MEDIUM'
    });

    return res.status(403).json({ 
      success: false,
      error: 'Se requieren permisos de administrador' 
    });
  }
  
  next();
};

/**
 * Rate limiting simple en memoria (para producción usar Redis)
 */
const rateLimitMap = new Map();

const rateLimit = (maxRequests = 100, windowMs = 60000) => {
  return (req, res, next) => {
    const key = req.user ? `user_${req.user.id}` : `ip_${req.ip}`;
    const now = Date.now();
    
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, { 
        count: 1, 
        resetTime: now + windowMs,
        firstRequest: now 
      });
      return next();
    }

    const userLimit = rateLimitMap.get(key);
    
    // Reset counter if window has passed
    if (now > userLimit.resetTime) {
      userLimit.count = 1;
      userLimit.resetTime = now + windowMs;
      userLimit.firstRequest = now;
      return next();
    }

    if (userLimit.count >= maxRequests) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        userId: req.user ? req.user.id : null,
        userEmail: req.user ? req.user.email : null,
        ip: req.ip,
        route: req.originalUrl,
        requests: userLimit.count,
        window: `${windowMs/1000}s`,
        severity: 'MEDIUM'
      });

      const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000);
      
      return res.status(429).json({ 
        success: false,
        error: 'Demasiadas solicitudes. Por favor intenta más tarde.',
        retryAfter: `${retryAfter} segundos`
      });
    }

    userLimit.count++;
    next();
  };
};

/**
 * Validación de UUID para prevenir IDOR
 */
const validateResourceId = (req, res, next) => {
  const id = req.params.id;
  
  // Validar que el ID sea un número positivo
  if (!id || isNaN(id) || parseInt(id) <= 0) {
    return res.status(400).json({
      success: false,
      error: 'ID de recurso inválido'
    });
  }
  
  next();
};

/**
 * Sanitización de datos de entrada
 */
const sanitizeInput = (req, res, next) => {
  // Sanitizar body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
        
        // Prevenir XSS básico
        req.body[key] = req.body[key]
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }
    });
  }
  
  // Sanitizar query params
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    });
  }
  
  next();
};

module.exports = {
  checkOwnership,
  requireAdmin,
  rateLimit,
  validateResourceId,
  sanitizeInput
};