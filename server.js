import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config(); 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

/* =========================
   MIDDLEWARE
========================= */

app.use(cors());
app.use(express.json({ limit: '50mb' }));

/* Serve React/Vite build */
app.use(express.static(path.join(__dirname, 'dist')));

/* =========================
   DATABASE
========================= */

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql-32635dc5-mysql-lab-project-madaje.e.aivencloud.com',
  user: process.env.DB_USER || 'avnadmin',
  password: process.env.DB_PASSWORD || 'AVNS_Bec0I9laP4vj1JUb4OH',
  database: process.env.DB_NAME || 'campus_event_scheduller',
  port: process.env.DB_PORT || 15645,
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/* =========================
   HEALTH CHECK
========================= */

app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    message: 'CampusPulse Node Active'
  });
});

/* =========================
   CONFIG
========================= */

app.get('/api/config', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM site_config WHERE id = 1'
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config', async (req, res) => {
  try {
    const c = req.body;

    await pool.query(
      `UPDATE site_config 
       SET campusName=?, heroHeadline=?, heroSubheadline=?, heroImage=?, footerText=?, logoImage=? 
       WHERE id=1`,
      [
        c.campusName,
        c.heroHeadline,
        c.heroSubheadline,
        c.heroImage,
        c.footerText,
        c.logoImage
      ]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   EVENTS
========================= */

app.get('/api/events', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM events ORDER BY date DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const e = req.body;

    await pool.query(
      `INSERT INTO events 
      (id, title, description, date, startTime, endTime, location, category, organizer, attendees, image, isPopular, isLive, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        e.id,
        e.title,
        e.description,
        e.date,
        e.startTime,
        e.endTime,
        e.location,
        e.category,
        e.organizer,
        e.attendees || 0,
        e.image || '',
        e.isPopular || 0,
        e.isLive || 0,
        e.status || 'Pending'
      ]
    );

    res.status(201).json(e);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   USERS
========================= */

app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const u = req.body;

    await pool.query(
      'INSERT INTO users (id, name, email, password, role, avatar) VALUES (?, ?, ?, ?, ?, ?)',
      [u.id, u.name, u.email, u.password, u.role, u.avatar]
    );

    res.status(201).json(u);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, avatar } = req.body;

    await pool.query(
      'UPDATE users SET name=?, email=?, password=?, role=?, avatar=? WHERE id=?',
      [name, email, password, role, avatar, id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   FEEDBACK
========================= */

app.get('/api/feedback', async (req, res) => {
  try {
    const [messages] = await pool.query(
      'SELECT * FROM feedback ORDER BY timestamp DESC'
    );

    for (const msg of messages) {
      const [replies] = await pool.query(
        'SELECT * FROM replies WHERE feedback_id=? ORDER BY timestamp ASC',
        [msg.id]
      );
      msg.replies = replies;
    }

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   AUDIT
========================= */

app.get('/api/audit', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM audit_logs ORDER BY timestamp DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   🔥 FIXED FRONTEND ROUTE (IMPORTANT)
========================= */

/* ❌ NO app.get('*') anymore */

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log('====================================');
  console.log(' CAMPUSPULSE SERVER ACTIVE');
  console.log(' PORT:', PORT);
  console.log(' DB:', process.env.DB_NAME);
  console.log('====================================');
});
