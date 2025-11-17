const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { db } = require('../database');
const { authenticateToken } = require('./auth');
const { logSecurityEvent } = require('../middleware/logger');
const { requireAdmin } = require('../middleware/authorization');
const router = express.Router();

// Validaciones
const validateUserId = [
  param('id').isInt({ min: 1 }).withMessage('ID de usuario inválido')
];

const validateUserUpdate = [
  param('id').isInt({ min: 1 }).withMessage('ID de usuario inválido'),
  body('name').notEmpty().withMessage('El nombre es requerido'),
  body('email').isEmail().withMessage('Email inválido')
];

// ✅ CORREGIDO: Solo puede ver su propia información o admin puede ver todos
router.get('/:id', authenticateToken, validateUserId, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = parseInt(req.params.id);
  const requestingUser = req.user;

  // ✅ Verificar que el usuario solo acceda a su propia información
  if (userId !== requestingUser.id && requestingUser.role !== 'admin') {
    logSecurityEvent('UNAUTHORIZED_USER_ACCESS_BLOCKED', {
      message: '🛡️ Intento bloqueado de acceder a datos de otro usuario',
      accessor: requestingUser.email,
      accessorId: requestingUser.id,
      targetUserId: userId,
      severity: 'HIGH'
    });

    return res.status(403).json({ 
      error: 'No tienes permiso para acceder a esta información' 
    });
  }

  // Si es el propio usuario o es admin, permitir acceso
  db.get(
    'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Error en el servidor' });
      }

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.created_at
        }
      });
    }
  );
});

// ✅ CORREGIDO: Solo admin puede listar todos los usuarios
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  // ✅ Solo administradores pueden ver la lista completa
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  // ✅ Implementar paginación
  db.all(
    'SELECT id, email, name, role, created_at FROM users LIMIT ? OFFSET ?',
    [limit, offset],
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: 'Error en el servidor' });
      }

      // Obtener total de usuarios
      db.get('SELECT COUNT(*) as total FROM users', [], (err, countResult) => {
        if (err) {
          return res.status(500).json({ error: 'Error en el servidor' });
        }

        res.json({
          success: true,
          count: users.length,
          total: countResult.total,
          page: page,
          totalPages: Math.ceil(countResult.total / limit),
          users: users.map(user => ({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.created_at
          }))
        });
      });
    }
  );
});

// ✅ CORREGIDO: Solo puede actualizar su propia información
router.put('/:id', authenticateToken, validateUserUpdate, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = parseInt(req.params.id);
  const requestingUser = req.user;
  const { name, email } = req.body;

  // ✅ Verificar ownership
  if (userId !== requestingUser.id && requestingUser.role !== 'admin') {
    logSecurityEvent('UNAUTHORIZED_USER_UPDATE_BLOCKED', {
      message: '🛡️ Intento bloqueado de modificar datos de otro usuario',
      modifiedBy: requestingUser.id,
      targetUserId: userId,
      severity: 'HIGH'
    });

    return res.status(403).json({ 
      error: 'No tienes permiso para modificar esta información' 
    });
  }

  db.run(
    'UPDATE users SET name = ?, email = ? WHERE id = ?',
    [name, email, userId],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'El email ya está en uso' });
        }
        return res.status(500).json({ error: 'Error al actualizar usuario' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.json({
        success: true,
        message: 'Usuario actualizado correctamente'
      });
    }
  );
});

// ✅ CORREGIDO: Solo admin puede eliminar usuarios
router.delete('/:id', authenticateToken, requireAdmin, validateUserId, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = parseInt(req.params.id);
  const requestingUser = req.user;

  // ✅ Prevenir que admin se elimine a sí mismo
  if (userId === requestingUser.id) {
    return res.status(400).json({ 
      error: 'No puedes eliminar tu propia cuenta' 
    });
  }

  db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error al eliminar usuario' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    logSecurityEvent('USER_DELETED_BY_ADMIN', {
      message: 'Usuario eliminado por administrador',
      deletedBy: requestingUser.id,
      deletedByEmail: requestingUser.email,
      targetUserId: userId,
      severity: 'MEDIUM'
    });

    res.json({
      success: true,
      message: 'Usuario eliminado correctamente'
    });
  });
});

// ✅ Endpoint para obtener perfil del usuario actual
router.get('/me/profile', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.get(
    'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Error en el servidor' });
      }

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.created_at
        }
      });
    }
  );
});

module.exports = router;