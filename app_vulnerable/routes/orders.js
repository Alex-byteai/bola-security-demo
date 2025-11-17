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

  // ⚠️ FALLA CRÍTICA: No se verifica si la orden pertenece al usuario
  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }

    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    // Registrar evento de seguridad si se detecta BOLA
    if (detectBOLAAttempt(req, requestingUser, order.user_id)) {
      console.log(`🚨 BOLA DETECTADO: Usuario ${requestingUser.email} accedió a orden ${orderId} del usuario ${order.user_id}`);
    }

    // ⚠️ Se devuelve la orden sin importar a quién pertenece
    res.json({
      success: true,
      order: {
        id: order.id,
        userId: order.user_id,
        product: order.product,
        amount: order.amount,
        status: order.status,
        creditCard: order.credit_card,  // ⚠️ Información sensible expuesta
        address: order.address,
        phone: order.phone,
        createdAt: order.created_at
      },
      // ⚠️ Para fines educativos: indicar explícitamente la vulnerabilidad
      security_note: "VULNERABLE: Esta endpoint no verifica la propiedad del recurso (BOLA)"
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

  // ⚠️ No se verifica ownership antes de actualizar
  db.run(
    'UPDATE orders SET status = ? WHERE id = ?',
    [status, orderId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error al actualizar' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Orden no encontrada' });
      }

      // Obtener detalles de la orden para logging
      db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
        if (!err && order) {
          detectBOLAAttempt(req, req.user, order.user_id);
        }
      });

      logSecurityEvent('ORDER_MODIFIED_BOLA', {
        message: 'Orden modificada sin verificación de propiedad',
        userId: req.user.id,
        userEmail: req.user.email,
        orderId,
        newStatus: status,
        severity: 'HIGH'
      });

      res.json({ 
        success: true, 
        message: 'Orden actualizada',
        security_note: "VULNERABLE: Modificación sin verificación de propiedad"
      });
    }
  );
});

// ⚠️ VULNERABILIDAD: Eliminar orden sin verificación
router.delete('/:id', authenticateToken, (req, res) => {
  const orderId = req.params.id;

  // ⚠️ Cualquier usuario autenticado puede eliminar cualquier orden
  db.run('DELETE FROM orders WHERE id = ?', [orderId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error al eliminar' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    logSecurityEvent('ORDER_DELETED_BOLA', {
      message: '🚨 CRÍTICO: Orden eliminada sin verificación de propiedad',
      userId: req.user.id,
      userEmail: req.user.email,
      orderId,
      severity: 'CRITICAL'
    });

    res.json({ 
      success: true, 
      message: 'Orden eliminada',
      security_note: "VULNERABLE: Eliminación sin verificación de propiedad"
    });
  });
});

module.exports = router;