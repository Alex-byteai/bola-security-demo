const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { db } = require('../database');
const { authenticateToken } = require('./auth');
const { logSecurityEvent } = require('../middleware/logger');
const { checkOwnership, requireAdmin, validateResourceId } = require('../middleware/authorization');
const router = express.Router();

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

// ✅ SEGURO: Obtener información de pago CON verificación de ownership
router.get('/:id', 
  authenticateToken, 
  validateResourceId,
  checkOwnership('payment'),
  (req, res) => {
    const paymentId = req.params.id;
    
    db.get('SELECT * FROM payments WHERE id = ?', [paymentId], (err, payment) => {
      if (err) {
        return res.status(500).json({ 
          success: false,
          error: 'Error en el servidor' 
        });
      }

      if (!payment) {
        return res.status(404).json({ 
          success: false,
          error: 'Pago no encontrado' 
        });
      }

      // ✅ Información sensible ofuscada
      res.json({
        success: true,
        payment: {
          id: payment.id,
          orderId: payment.order_id,
          amount: payment.amount,
          bankAccount: `****${payment.bank_account.slice(-4)}`, // ✅ Ofuscado
          status: payment.status,
          createdAt: payment.created_at
        },
        security_note: "✅ Información protegida - Solo datos autorizados"
      });
    });
  }
);

// ✅ SEGURO: Listar pagos del usuario actual
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all('SELECT * FROM payments WHERE user_id = ?', [userId], (err, payments) => {
    if (err) {
      return res.status(500).json({ 
        success: false,
        error: 'Error en el servidor' 
      });
    }

    res.json({
      success: true,
      count: payments.length,
      payments: payments.map(payment => ({
        id: payment.id,
        orderId: payment.order_id,
        amount: payment.amount,
        bankAccount: `****${payment.bank_account.slice(-4)}`, // ✅ Ofuscado
        status: payment.status,
        createdAt: payment.created_at
      }))
    });
  });
});

// ✅ SEGURO: Crear pago (solo para el usuario actual)
router.post('/',
  authenticateToken,
  [
    body('orderId').isInt({ min: 1 }).withMessage('Order ID inválido'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Monto debe ser mayor a 0'),
    body('bankAccount').isLength({ min: 4 }).withMessage('Cuenta bancaria requerida')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { orderId, amount, bankAccount, routingNumber } = req.body;
    const userId = req.user.id;

    // ✅ Verificar que la orden pertenece al usuario
    db.get(
      'SELECT id FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId],
      (err, order) => {
        if (err) {
          return res.status(500).json({ 
            success: false,
            error: 'Error en el servidor' 
          });
        }

        if (!order) {
          return res.status(404).json({ 
            success: false,
            error: 'Orden no encontrada o no tienes permisos' 
          });
        }

        // ✅ Crear pago
        db.run(
          'INSERT INTO payments (user_id, order_id, amount, bank_account, routing_number) VALUES (?, ?, ?, ?, ?)',
          [userId, orderId, amount, bankAccount, routingNumber],
          function(err) {
            if (err) {
              return res.status(500).json({ 
                success: false,
                error: 'Error al crear pago' 
              });
            }

            logSecurityEvent('PAYMENT_CREATED', {
              userId: userId,
              paymentId: this.lastID,
              amount: amount,
              orderId: orderId,
              severity: 'LOW'
            });

            res.status(201).json({
              success: true,
              message: 'Pago creado exitosamente',
              paymentId: this.lastID
            });
          }
        );
      }
    );
  }
);

// ✅ SEGURO: Solo admin puede ver todos los pagos
router.get('/admin/all', 
  authenticateToken, 
  requireAdmin,
  (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    db.all(
      `SELECT p.*, u.email as user_email 
       FROM payments p 
       JOIN users u ON p.user_id = u.id 
       LIMIT ? OFFSET ?`,
      [limit, offset],
      (err, payments) => {
        if (err) {
          return res.status(500).json({ 
            success: false,
            error: 'Error en el servidor' 
          });
        }

        // Obtener total
        db.get('SELECT COUNT(*) as total FROM payments', [], (err, countResult) => {
          if (err) {
            return res.status(500).json({ 
              success: false,
              error: 'Error en el servidor' 
            });
          }

          logSecurityEvent('ADMIN_PAYMENTS_ACCESS', {
            adminId: req.user.id,
            adminEmail: req.user.email,
            totalPayments: countResult.total,
            severity: 'LOW'
          });

          res.json({
            success: true,
            count: payments.length,
            total: countResult.total,
            page: page,
            totalPages: Math.ceil(countResult.total / limit),
            payments: payments.map(payment => ({
              id: payment.id,
              userId: payment.user_id,
              userEmail: payment.user_email,
              orderId: payment.order_id,
              amount: payment.amount,
              bankAccount: `****${payment.bank_account.slice(-4)}`,
              status: payment.status,
              createdAt: payment.created_at
            }))
          });
        });
      }
    );
  }
);

module.exports = router;