import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const DB_PATH = join(__dirname, 'data', 'database.db');

// Ensure data directory exists
const dataDir = join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Initialize SQLite Database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // URLs table
    db.run(`
      CREATE TABLE IF NOT EXISTS urls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        short_code TEXT UNIQUE NOT NULL,
        original_url TEXT NOT NULL,
        click_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('Database tables initialized');
  });
}

// Helper functions
function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Middleware to verify JWT token
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.userId = payload.userId;
  next();
}

// Routes

// Register
app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const hashedPassword = bcryptjs.hashSync(password, 10);

  db.run(
    'INSERT INTO users (email, password) VALUES (?, ?)',
    [email, hashedPassword],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Email already registered' });
        }
        return res.status(500).json({ error: 'Registration failed' });
      }

      const token = generateToken(this.lastID);
      res.json({
        success: true,
        token,
        user: { id: this.lastID, email }
      });
    }
  );
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  db.get('SELECT id, password FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Login failed' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = bcryptjs.compareSync(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);
    res.json({
      success: true,
      token,
      user: { id: user.id, email }
    });
  });
});

// Verify token
app.post('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ valid: false });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ valid: false });
  }

  db.get('SELECT id, email FROM users WHERE id = ?', [payload.userId], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ valid: false });
    }

    res.json({
      valid: true,
      user: { id: user.id, email: user.email }
    });
  });
});

// Shorten URL
app.post('/api/urls/shorten', authMiddleware, (req, res) => {
  const { originalUrl, shortCode } = req.body;

  if (!originalUrl) {
    return res.status(400).json({ error: 'Original URL required' });
  }

  db.run(
    'INSERT INTO urls (user_id, short_code, original_url) VALUES (?, ?, ?)',
    [req.userId, shortCode, originalUrl],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Short code already exists' });
        }
        return res.status(500).json({ error: 'Failed to create short URL' });
      }

      res.json({
        id: this.lastID,
        short_code: shortCode,
        original_url: originalUrl,
        click_count: 0
      });
    }
  );
});

// Get user's URLs
app.get('/api/urls', authMiddleware, (req, res) => {
  db.all(
    'SELECT id, short_code, original_url, click_count, created_at FROM urls WHERE user_id = ? ORDER BY created_at DESC',
    [req.userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch URLs' });
      }

      res.json(rows || []);
    }
  );
});

// Get single URL by short code and increment clicks
app.get('/api/urls/redirect/:shortCode', (req, res) => {
  const { shortCode } = req.params;

  db.get(
    'SELECT id, original_url FROM urls WHERE short_code = ?',
    [shortCode],
    (err, row) => {
      if (err || !row) {
        return res.status(404).json({ error: 'Short URL not found' });
      }

      // Increment click count
      db.run(
        'UPDATE urls SET click_count = click_count + 1 WHERE id = ?',
        [row.id],
        (updateErr) => {
          if (updateErr) {
            console.error('Failed to update click count:', updateErr);
          }
        }
      );

      res.json({ original_url: row.original_url });
    }
  );
});

// Delete URL
app.delete('/api/urls/:shortCode', authMiddleware, (req, res) => {
  const { shortCode } = req.params;

  db.run(
    'DELETE FROM urls WHERE short_code = ? AND user_id = ?',
    [shortCode, req.userId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete URL' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'URL not found' });
      }

      res.json({ success: true });
    }
  );
});

// Update URL (e.g., for click count)
app.put('/api/urls/:shortCode/click', (req, res) => {
  const { shortCode } = req.params;

  db.run(
    'UPDATE urls SET click_count = click_count + 1 WHERE short_code = ?',
    [shortCode],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update URL' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'URL not found' });
      }

      res.json({ success: true });
    }
  );
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Serve HTML for any route not matching /api
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.get('/urlshortner*', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}/urlshortner`);
});

export default app;
