const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('./auth');
const { logSecurityEvent, detectBOLAAttempt } = require('../middleware/logger');
const router = express.Router();

// ⚠️ VULNERABILIDAD: Obtener información de cualquier usuario
// Un usuario puede ver datos de otros usuarios solo conociendo el ID
router.get('/:id', authenticateToken, (req, res) => {
  const userId = req.params.id;
  const requestingUser = req.user;

  // ⚠️ NO se verifica si el usuario puede ver esta información
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

      // Registrar si se accede a datos de otro usuario
      if (detectBOLAAttempt(req, requestingUser, parseInt(userId))) {
        console.log(`🚨 BOLA EN USUARIOS: ${requestingUser.email} accedió a datos del usuario ${userId}`);
      }

      // ⚠️ Se devuelven los datos sin verificar ownership
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.created_at
        },
        security_note: requestingUser.id !== parseInt(userId) ? 
          "VULNERABLE: Acceso a datos de otro usuario (BOLA)" : 
          "Acceso autorizado a datos propios"
      });
    }
  );
});

// Listar todos los usuarios (⚠️ VULNERABLE - no debería existir sin paginación/límites)
router.get('/', authenticateToken, (req, res) => {
  // ⚠️ Cualquier usuario autenticado puede ver TODOS los usuarios
  db.all(
    'SELECT id, email, name, role, created_at FROM users',
    [],
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: 'Error en el servidor' });
      }

      logSecurityEvent('USER_LIST_ACCESS_BOLA', {
        message: 'Usuario listó todos los usuarios del sistema',
        userId: req.user.id,
        userEmail: req.user.email,
        totalUsers: users.length,
        severity: 'MEDIUM'
      });

      res.json({
        success: true,
        count: users.length,
        users: users.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.created_at
        })),
        security_note: "VULNERABLE: Lista completa de usuarios expuesta"
      });
    }
  );
});

// ⚠️ VULNERABILIDAD: Actualizar datos de cualquier usuario
router.put('/:id', authenticateToken, (req, res) => {
  const userId = req.params.id;
  const { name, email } = req.body;

  // ⚠️ NO se verifica si el usuario puede modificar estos datos
  db.run(
    'UPDATE users SET name = ?, email = ? WHERE id = ?',
    [name, email, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error al actualizar usuario' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      detectBOLAAttempt(req, req.user, parseInt(userId));

      logSecurityEvent('USER_DATA_MODIFIED_BOLA', {
        message: '⚠️ Datos de usuario modificados sin verificación',
        modifiedBy: req.user.id,
        modifiedByEmail: req.user.email,
        targetUserId: userId,
        severity: 'HIGH'
      });

      res.json({
        success: true,
        message: 'Usuario actualizado correctamente',
        security_note: req.user.id !== parseInt(userId) ? 
          "VULNERABLE: Modificación de datos de otro usuario (BOLA)" : 
          "Modificación autorizada"
      });
    }
  );
});

// ⚠️ VULNERABILIDAD: Eliminar cualquier usuario
router.delete('/:id', authenticateToken, (req, res) => {
  const userId = req.params.id;

  // ⚠️ Cualquier usuario puede eliminar a otros usuarios
  db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error al eliminar usuario' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    logSecurityEvent('USER_DELETED_BOLA', {
      message: '🚨 CRÍTICO: Usuario eliminado sin verificación',
      deletedBy: req.user.id,
      deletedByEmail: req.user.email,
      targetUserId: userId,
      severity: 'CRITICAL'
    });

    res.json({
      success: true,
      message: 'Usuario eliminado',
      security_note: req.user.id !== parseInt(userId) ? 
        "VULNERABLE: Eliminación de otro usuario (BOLA)" : 
        "Usuario eliminado (acción autorizada)"
    });
  });
});

module.exports = router;