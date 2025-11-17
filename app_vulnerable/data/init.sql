-- Script de inicialización de base de datos
-- Para proyecto BOLA - Demostración de vulnerabilidad

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de órdenes
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Insertar usuario administrador por defecto
INSERT OR IGNORE INTO users (email, password, name, role) 
VALUES (
    'admin@example.com',
    '$2a$10$8K1p/a0dL3LKzao0gsCx9u.ydV6B6N5VVu3S9dHkCQhV6jE5hUYTe', -- hash de 'admin123'
    'Admin User',
    'admin'
);

-- Insertar usuarios de prueba
INSERT OR IGNORE INTO users (email, password, name, role) 
VALUES 
    (
        'alice@example.com',
        '$2a$10$8K1p/a0dL3LKzao0gsCx9u.ydV6B6N5VVu3S9dHkCQhV6jE5hUYTe', -- hash de 'password123'
        'Alice Johnson',
        'user'
    ),
    (
        'bob@example.com',
        '$2a$10$8K1p/a0dL3LKzao0gsCx9u.ydV6B6N5VVu3S9dHkCQhV6jE5hUYTe',
        'Bob Smith',
        'user'
    ),
    (
        'charlie@example.com',
        '$2a$10$8K1p/a0dL3LKzao0gsCx9u.ydV6B6N5VVu3S9dHkCQhV6jE5hUYTe',
        'Charlie Brown',
        'user'
    );

-- Insertar órdenes de prueba (solo si los usuarios existen)
INSERT OR IGNORE INTO orders (user_id, product, amount, status, credit_card, address, phone)
SELECT 1, 'Laptop Dell XPS 15', 1899.99, 'pending', '**** **** **** 1234', '123 Main St, Ciudad', '+51 999 888 777'
WHERE EXISTS(SELECT 1 FROM users WHERE id = 1);

INSERT OR IGNORE INTO orders (user_id, product, amount, status, credit_card, address, phone)
SELECT 1, 'Mouse Logitech MX Master', 99.99, 'pending', '**** **** **** 1234', '123 Main St, Ciudad', '+51 999 888 777'
WHERE EXISTS(SELECT 1 FROM users WHERE id = 1);

INSERT OR IGNORE INTO orders (user_id, product, amount, status, credit_card, address, phone)
SELECT 2, 'iPhone 15 Pro', 1299.99, 'pending', '**** **** **** 5678', '456 Oak Ave, Lima', '+51 987 654 321'
WHERE EXISTS(SELECT 1 FROM users WHERE id = 2);

INSERT OR IGNORE INTO orders (user_id, product, amount, status, credit_card, address, phone)
SELECT 2, 'AirPods Pro', 249.99, 'pending', '**** **** **** 5678', '456 Oak Ave, Lima', '+51 987 654 321'
WHERE EXISTS(SELECT 1 FROM users WHERE id = 2);

INSERT OR IGNORE INTO orders (user_id, product, amount, status, credit_card, address, phone)
SELECT 3, 'Samsung Galaxy S24', 999.99, 'pending', '**** **** **** 9012', '789 Pine Rd, Cusco', '+51 912 345 678'
WHERE EXISTS(SELECT 1 FROM users WHERE id = 3);

INSERT OR IGNORE INTO orders (user_id, product, amount, status, credit_card, address, phone)
SELECT 3, 'PlayStation 5', 499.99, 'shipped', '**** **** **** 9012', '789 Pine Rd, Cusco', '+51 912 345 678'
WHERE EXISTS(SELECT 1 FROM users WHERE id = 3);