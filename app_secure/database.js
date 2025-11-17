const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'data', 'database.db');
const db = new sqlite3.Database(dbPath);

function initDatabase() {
  db.serialize(() => {
    // Tabla de usuarios
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de órdenes
    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        credit_card TEXT,
        address TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Verificar si hay usuarios
    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
      if (!err && row.count === 0) {
        seedDatabase();
      }
    });
  });

  console.log('✅ Base de datos inicializada');
}

function seedDatabase() {
  console.log('📦 Poblando base de datos con datos de prueba...');
  
  const users = [
    { email: 'alice@example.com', name: 'Alice Johnson', password: 'password123' },
    { email: 'bob@example.com', name: 'Bob Smith', password: 'password123' },
    { email: 'charlie@example.com', name: 'Charlie Brown', password: 'password123' },
    { email: 'admin@example.com', name: 'Admin User', password: 'admin123', role: 'admin' }
  ];

  const orders = [
    { user_id: 1, product: 'Laptop Dell XPS 15', amount: 1899.99, credit_card: '**** **** **** 1234', address: '123 Main St, Ciudad', phone: '+51 999 888 777' },
    { user_id: 1, product: 'Mouse Logitech MX Master', amount: 99.99, credit_card: '**** **** **** 1234', address: '123 Main St, Ciudad', phone: '+51 999 888 777' },
    { user_id: 2, product: 'iPhone 15 Pro', amount: 1299.99, credit_card: '**** **** **** 5678', address: '456 Oak Ave, Lima', phone: '+51 987 654 321' },
    { user_id: 2, product: 'AirPods Pro', amount: 249.99, credit_card: '**** **** **** 5678', address: '456 Oak Ave, Lima', phone: '+51 987 654 321' },
    { user_id: 3, product: 'Samsung Galaxy S24', amount: 999.99, credit_card: '**** **** **** 9012', address: '789 Pine Rd, Cusco', phone: '+51 912 345 678' },
    { user_id: 3, product: 'PlayStation 5', amount: 499.99, status: 'shipped', credit_card: '**** **** **** 9012', address: '789 Pine Rd, Cusco', phone: '+51 912 345 678' }
  ];

  // Insertar usuarios
  users.forEach(user => {
    const hashedPassword = bcrypt.hashSync(user.password, 10);
    db.run(
      'INSERT INTO users (email, name, password, role) VALUES (?, ?, ?, ?)',
      [user.email, user.name, hashedPassword, user.role || 'user']
    );
  });

  // Insertar órdenes
  setTimeout(() => {
    orders.forEach(order => {
      db.run(
        'INSERT INTO orders (user_id, product, amount, status, credit_card, address, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [order.user_id, order.product, order.amount, order.status || 'pending', order.credit_card, order.address, order.phone]
      );
    });
    console.log('✅ Datos de prueba insertados correctamente');
  }, 500);
}

module.exports = { db, initDatabase };