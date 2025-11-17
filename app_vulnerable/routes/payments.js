const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('./auth');
const { logSecurityEvent, detectBOLAAttempt } = require('../middleware/logger');
const router = express.Router();

// ⚠️ VULNERABILIDAD BOLA: Nuevo recurso - Pagos
// Crear tabla de pagos si no existe
router.use((req, res, next) => {
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_id INTEGER,
      amount REAL NOT NULL,
      bank_account TEXT,
      routing_number TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creando tabla payments:', err);
    }
    next();
  });
});

// Insertar datos de prueba de pagos
router.use((req, res, next) => {
  db.get('SELECT COUNT(*) as count FROM payments', (err, row) => {
    if (!err && row.count === 0) {
      const payments = [
        { user_id: 1, order_id: 1, amount: 1899.99, bank_account: '****1234', routing_number: '021000021', status: 'completed' },
        { user_id: 2, order_id: 3, amount: 1299.99, bank_account: '****5678', routing_number: '021000022', status: 'pending' },
        { user_id: 3, order_id: 5, amount: 999.99, bank_account: '****9012', routing_number: '021000023', status: 'completed' }
      ];

      payments.forEach(payment => {
        db.run(
          'INSERT INTO payments (user_id, order_id, amount, bank_account, routing_number, status) VALUES (?, ?, ?, ?, ?, ?)',
          [payment.user_id, payment.order_id, payment.amount, payment.bank_account, payment.routing_number, payment.status]
        );
      });
      console.log('✅ Datos de prueba de pagos insertados');
    }
    next();
  });
});

// ⚠️ VULNERABILIDAD BOLA: Obtener información de pagos sin verificar ownership
router.get('/:id', authenticateToken, (req, res) => {
  const paymentId = req.params.id;
  const requestingUser = req.user;
  
  // ⚠️ VULNERABLE: Sin verificación de propiedad
  db.get('SELECT * FROM payments WHERE id = ?', [paymentId], (err, payment) => {
    if (err) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }

    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    // Detectar BOLA
    if (detectBOLAAttempt(req, requestingUser, payment.user_id)) {
      console.log(`🚨 BOLA EN PAGOS: ${requestingUser.email} accedió al pago ${paymentId} del usuario ${payment.user_id}`);
    }

    // ⚠️ Exponer información bancaria sensible
    res.json({
      success: true,
      payment: {
        id: payment.id,
        userId: payment.user_id,
        orderId: payment.order_id,
        amount: payment.amount,
        bankAccount: payment.bank_account,  // ⚠️ Información sensible
        routingNumber: payment.routing_number, // ⚠️ Información crítica
        status: payment.status,
        createdAt: payment.created_at
      },
      security_note: "VULNERABLE: Acceso a información bancaria sin verificación (BOLA)"
    });
  });
});

// ⚠️ VULNERABILIDAD: Listar todos los pagos del sistema
router.get('/', authenticateToken, (req, res) => {
  // ⚠️ Cualquier usuario puede ver TODOS los pagos
  db.all('SELECT * FROM payments', [], (err, payments) => {
    if (err) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }

    logSecurityEvent('ALL_PAYMENTS_ACCESS_BOLA', {
      message: 'Usuario accedió a todos los pagos del sistema',
      userId: req.user.id,
      userEmail: req.user.email,
      totalPayments: payments.length,
      severity: 'HIGH'
    });

    res.json({
      success: true,
      count: payments.length,
      payments: payments.map(payment => ({
        id: payment.id,
        userId: payment.user_id,
        orderId: payment.order_id,
        amount: payment.amount,
        bankAccount: payment.bank_account,
        routingNumber: payment.routing_number,
        status: payment.status,
        createdAt: payment.created_at
      })),
      security_note: "VULNERABLE: Exposición completa de datos financieros (BOLA)"
    });
  });
});

// ⚠️ VULNERABILIDAD: Crear pago para cualquier usuario
router.post('/', authenticateToken, (req, res) => {
  const { userId, orderId, amount, bankAccount, routingNumber } = req.body;
  
  // ⚠️ Cualquier usuario puede crear pagos para otros usuarios
  db.run(
    'INSERT INTO payments (user_id, order_id, amount, bank_account, routing_number) VALUES (?, ?, ?, ?, ?)',
    [userId, orderId, amount, bankAccount, routingNumber],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error al crear pago' });
      }

      logSecurityEvent('PAYMENT_CREATED_BOLA', {
        message: 'Pago creado sin verificación de propiedad',
        createdBy: req.user.id,
        createdByEmail: req.user.email,
        targetUserId: userId,
        amount: amount,
        severity: 'MEDIUM'
      });

      res.status(201).json({
        success: true,
        message: 'Pago creado exitosamente',
        paymentId: this.lastID,
        security_note: "VULNERABLE: Creación de pagos para otros usuarios (BOLA)"
      });
    }
  );
});

module.exports = router;