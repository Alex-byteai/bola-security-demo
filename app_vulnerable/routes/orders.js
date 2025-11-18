const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('./auth');
const { logSecurityEvent, detectBOLAAttempt } = require('../middleware/logger');
const router = express.Router();

// ⚠️ VULNERABILIDAD BOLA: Obtener orden por ID sin verificar ownership
// Esta ruta permite acceder a cualquier orden solo conociendo el ID
router.get('/:id', authenticateToken, (req, res) => {
  const orderId = req.params.id;
  const requestingUser = req.user;

  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }

    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    const isForeignOrder = requestingUser.id !== order.user_id;

    if (isForeignOrder) {
      detectBOLAAttempt(req, requestingUser, order.user_id, {
        message: `Lectura de orden ajena #${orderId}`,
        action: 'READ_FOREIGN_ORDER',
        resourceType: 'order',
        targetId: orderId,
        severity: 'HIGH'
      });

      logSecurityEvent('ORDER_ACCESS_BOLA', {
        message: 'Orden ajena consultada sin bloqueo',
        userId: requestingUser.id,
        userEmail: requestingUser.email,
        orderId,
        victimId: order.user_id,
        blocked: false,
        severity: 'HIGH'
      });

      res.locals.securityEvent = 'ORDER_ACCESS_BOLA';
      res.locals.securitySeverity = 'HIGH';
      res.locals.securityMessage = `BOLA: ${requestingUser.email} accedió a orden ajena #${orderId}`;
      res.locals.securityMeta = {
        orderId,
        victimId: order.user_id,
        attackerId: requestingUser.id,
        attacker: requestingUser.email,
        blocked: false,
        vulnerability: 'BOLA_ORDER_ACCESS'
      };
    }

    res.json({
      success: true,
      order: {
        id: order.id,
        userId: order.user_id,
        product: order.product,
        amount: order.amount,
        status: order.status,
        creditCard: order.credit_card,
        address: order.address,
        phone: order.phone,
        createdAt: order.created_at
      },
      security_note: isForeignOrder
        ? 'VULNERABLE: Acceso a órdenes ajenas NO bloqueado (BOLA)'
        : 'Acceso autorizado a orden propia',
      should_block: isForeignOrder,
      blocked: false,
      enforcement: isForeignOrder ? 'not_blocked' : 'owner_only'
    });
  });
});

// Listar todas las órdenes del usuario autenticado (correcta)
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
router.post('/', authenticateToken, (req, res) => {
  const { product, amount, creditCard, address, phone } = req.body;
  const userId = req.user.id;

  if (!product || !amount) {
    return res.status(400).json({ error: 'Producto y monto son requeridos' });
  }

  db.run(
    'INSERT INTO orders (user_id, product, amount, credit_card, address, phone) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, product, amount, creditCard, address, phone],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error al crear la orden' });
      }

      res.status(201).json({
        success: true,
        message: 'Orden creada exitosamente',
        orderId: this.lastID
      });
    }
  );
});

// ⚠️ VULNERABILIDAD ADICIONAL: Actualizar orden sin verificación
router.put('/:id', authenticateToken, (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }

    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    const isForeignOrder = req.user.id !== order.user_id;

    db.run(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, orderId],
      function(updateErr) {
        if (updateErr) {
          return res.status(500).json({ error: 'Error al actualizar' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Orden no encontrada' });
        }

        if (isForeignOrder) {
          detectBOLAAttempt(req, req.user, order.user_id, {
            message: `Modificación de orden ajena #${orderId}`,
            action: 'UPDATE_FOREIGN_ORDER',
            resourceType: 'order',
            targetId: orderId,
            severity: 'CRITICAL'
          });

          logSecurityEvent('ORDER_MODIFIED_BOLA', {
            message: 'Orden ajena modificada sin bloqueo',
            userId: req.user.id,
            userEmail: req.user.email,
            orderId,
            previousStatus: order.status,
            newStatus: status,
            victimId: order.user_id,
            blocked: false,
            severity: 'CRITICAL'
          });

          res.locals.securityEvent = 'ORDER_MODIFIED_BOLA';
          res.locals.securitySeverity = 'CRITICAL';
          res.locals.securityMessage = `BOLA: ${req.user.email} modificó orden ajena #${orderId}`;
          res.locals.securityMeta = {
            orderId,
            victimId: order.user_id,
            attackerId: req.user.id,
            attacker: req.user.email,
            previousStatus: order.status,
            newStatus: status,
            blocked: false,
            vulnerability: 'BOLA_ORDER_UPDATE'
          };
        }

        res.json({
          success: true,
          message: 'Orden actualizada',
          security_note: isForeignOrder
            ? 'VULNERABLE: Modificación de orden ajena NO bloqueada (BOLA)'
            : 'Orden actualizada (mismo propietario)',
          should_block: isForeignOrder,
          blocked: false,
          enforcement: isForeignOrder ? 'not_blocked' : 'owner_only'
        });
      }
    );
  });
});

// ⚠️ VULNERABILIDAD: Eliminar orden sin verificación
router.delete('/:id', authenticateToken, (req, res) => {
  const orderId = req.params.id;

  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }

    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    const isForeignOrder = req.user.id !== order.user_id;

    db.run('DELETE FROM orders WHERE id = ?', [orderId], function(deleteErr) {
      if (deleteErr) {
        return res.status(500).json({ error: 'Error al eliminar' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Orden no encontrada' });
      }

      if (isForeignOrder) {
        detectBOLAAttempt(req, req.user, order.user_id, {
          message: `Eliminación de orden ajena #${orderId}`,
          action: 'DELETE_FOREIGN_ORDER',
          resourceType: 'order',
          targetId: orderId,
          severity: 'CRITICAL'
        });

        logSecurityEvent('ORDER_DELETED_BOLA', {
          message: 'Orden ajena eliminada sin bloqueo',
          userId: req.user.id,
          userEmail: req.user.email,
          orderId,
          victimId: order.user_id,
          blocked: false,
          severity: 'CRITICAL'
        });

        res.locals.securityEvent = 'ORDER_DELETED_BOLA';
        res.locals.securitySeverity = 'CRITICAL';
        res.locals.securityMessage = `BOLA: ${req.user.email} eliminó orden ajena #${orderId}`;
        res.locals.securityMeta = {
          orderId,
          victimId: order.user_id,
          attackerId: req.user.id,
          attacker: req.user.email,
          blocked: false,
          vulnerability: 'BOLA_ORDER_DELETE'
        };
      }

      res.json({
        success: true,
        message: 'Orden eliminada',
        security_note: isForeignOrder
          ? 'VULNERABLE: Eliminación de orden ajena NO bloqueada (BOLA)'
          : 'Orden eliminada (propietario)',
        should_block: isForeignOrder,
        blocked: false,
        enforcement: isForeignOrder ? 'not_blocked' : 'owner_only'
      });
    });
  });
});

module.exports = router;