const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { db } = require('../database');
const { authenticateToken } = require('./auth');
const { logSecurityEvent } = require('../middleware/logger');
const { checkOwnership } = require('../middleware/authorization');
const router = express.Router();

// Validaciones
const validateOrderId = [
  param('id').isInt({ min: 1 }).withMessage('ID de orden inválido')
];

const validateOrderCreation = [
  body('product').notEmpty().withMessage('El producto es requerido'),
  body('amount').isFloat({ min: 0.01 }).withMessage('El monto debe ser un número positivo')
];

const validateOrderUpdate = [
  param('id').isInt({ min: 1 }).withMessage('ID de orden inválido'),
  body('status').isIn(['pending', 'shipped', 'delivered', 'cancelled']).withMessage('Estado inválido')
];

// ✅ CORREGIDO: Obtener orden por ID CON verificación de ownership
router.get('/:id', authenticateToken, validateOrderId, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const orderId = req.params.id;
  const userId = req.user.id;

  // ✅ CORRECCIÓN: Verificamos que la orden pertenezca al usuario
  db.get(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?', 
    [orderId, userId], 
    (err, order) => {
      if (err) {
        return res.status(500).json({ error: 'Error en el servidor' });
      }

      if (!order) {
        // Registrar intento de acceso no autorizado
        logSecurityEvent('UNAUTHORIZED_ACCESS_BLOCKED', {
          message: '🛡️ Intento de acceso no autorizado bloqueado',
          userId: userId,
          userEmail: req.user.email,
          attemptedOrderId: orderId,
          severity: 'HIGH'
        });

        res.locals.securityEvent = 'UNAUTHORIZED_ACCESS_BLOCKED';
        res.locals.securitySeverity = 'HIGH';
        res.locals.securityMessage = `🛡️ Acceso bloqueado a orden ${orderId}`;
        res.locals.securityMeta = {
          attemptedOrderId: orderId,
          attackerId: userId,
          attacker: req.user.email,
          enforcement: 'owner_only',
          blocked: true
        };
        
        return res.status(404).json({ 
          error: 'Orden no encontrada o no tienes permiso para accederla' 
        });
      }

      // ✅ Solo se devuelve si el usuario es el propietario
      res.json({
        success: true,
        order: {
          id: order.id,
          product: order.product,
          amount: order.amount,
          status: order.status,
          creditCard: order.credit_card,
          address: order.address,
          phone: order.phone,
          createdAt: order.created_at
        }
      });
    }
  );
});

// Listar todas las órdenes del usuario autenticado
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all('SELECT * FROM orders WHERE user_id = ?', [userId], (err, orders) => {
    if (err) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }

    res.json({
      success: true,
      count: orders.length,
      orders: orders.map(order => ({
        id: order.id,
        product: order.product,
        amount: order.amount,
        status: order.status,
        createdAt: order.created_at
      }))
    });
  });
});

// Crear nueva orden
router.post('/', authenticateToken, validateOrderCreation, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { product, amount, creditCard, address, phone } = req.body;
  const userId = req.user.id;

  // ✅ Validación adicional
  if (amount <= 0 || amount > 999999) {
    return res.status(400).json({ error: 'Monto inválido' });
  }

  db.run(
    'INSERT INTO orders (user_id, product, amount, credit_card, address, phone) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, product, amount, creditCard, address, phone],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error al crear la orden' });
      }

      logSecurityEvent('ORDER_CREATED', {
        userId: userId,
        orderId: this.lastID,
        amount: amount
      });

      res.status(201).json({
        success: true,
        message: 'Orden creada exitosamente',
        orderId: this.lastID
      });
    }
  );
});

// ✅ CORREGIDO: Actualizar orden CON verificación de ownership
router.put('/:id', authenticateToken, validateOrderUpdate, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const orderId = req.params.id;
  const userId = req.user.id;
  const { status } = req.body;

  // ✅ Verificar que la orden existe Y pertenece al usuario
  db.get(
    'SELECT * FROM orders WHERE id = ? AND user_id = ?',
    [orderId, userId],
    (err, order) => {
      if (err) {
        return res.status(500).json({ error: 'Error en el servidor' });
      }

      if (!order) {
        logSecurityEvent('UNAUTHORIZED_UPDATE_BLOCKED', {
          userId: userId,
          orderId: orderId
        });

        res.locals.securityEvent = 'UNAUTHORIZED_UPDATE_BLOCKED';
        res.locals.securitySeverity = 'HIGH';
        res.locals.securityMessage = `🛡️ Actualización bloqueada para orden ${orderId}`;
        res.locals.securityMeta = {
          attemptedOrderId: orderId,
          attackerId: userId,
          attacker: req.user.email,
          enforcement: 'owner_only',
          blocked: true
        };
        
        return res.status(404).json({ 
          error: 'Orden no encontrada o no tienes permiso' 
        });
      }

      // ✅ Solo si es el propietario, actualizar
      db.run(
        'UPDATE orders SET status = ? WHERE id = ? AND user_id = ?',
        [status, orderId, userId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error al actualizar' });
          }

          res.json({ 
            success: true, 
            message: 'Orden actualizada correctamente' 
          });
        }
      );
    }
  );
});

// ✅ CORREGIDO: Eliminar orden CON verificación de ownership
router.delete('/:id', authenticateToken, validateOrderId, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const orderId = req.params.id;
  const userId = req.user.id;

  // ✅ Solo se elimina si pertenece al usuario
  db.run(
    'DELETE FROM orders WHERE id = ? AND user_id = ?', 
    [orderId, userId], 
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error al eliminar' });
      }

      if (this.changes === 0) {
        logSecurityEvent('UNAUTHORIZED_DELETE_BLOCKED', {
          userId: userId,
          orderId: orderId
        });

        res.locals.securityEvent = 'UNAUTHORIZED_DELETE_BLOCKED';
        res.locals.securitySeverity = 'HIGH';
        res.locals.securityMessage = `🛡️ Eliminación bloqueada para orden ${orderId}`;
        res.locals.securityMeta = {
          attemptedOrderId: orderId,
          attackerId: userId,
          attacker: req.user.email,
          enforcement: 'owner_only',
          blocked: true
        };
        
        return res.status(404).json({ 
          error: 'Orden no encontrada o no tienes permiso' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Orden eliminada correctamente' 
      });
    }
  );
});

module.exports = router;