import express from 'express';
import type { Request, Response } from 'express';
import Database from "better-sqlite3";
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const dbPath = path.join(__dirname, 'devotionals.db');
const isDbCreated = existsSync(dbPath);

const db = new Database(dbPath);

if (!isDbCreated) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS devotionals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      verse TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT NULL,
      deleted_at TEXT DEFAULT NULL
    );
  `);
  console.log('Database and all tables created successfully!');
}

// Middleware to parse JSON
app.use(express.json());

app.get('/hello_world', (req: Request, res: Response) => {
  res.send('Hello, World!');
});

app.get('/api/devotionals', (req: Request, res: Response) => {
  try {
    const statement = db.prepare('SELECT * FROM devotionals WHERE deleted_at IS NULL ORDER BY created_at DESC');
    const devotionals = statement.all();
    res.status(200).json(devotionals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve devotionals.' });
  }
});

// Get one devotional by ID
app.get('/api/devotionals/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const statement = db.prepare('SELECT * FROM devotionals WHERE id = ? AND deleted_at IS NULL');
    const devotional = statement.get(id);

    if (!devotional) {
      return res.status(404).json({ error: 'Devotional not found.' });
    }

    res.status(200).json(devotional);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve the devotional.' });
  }
});

//Create a devotional
app.post('/api/devotionals', (req: Request, res: Response) => {
  try {
    const { verse, content } = req.body;

    if (!verse || !content) {
      return res.status(400).json({ error: 'Verse and content are required.' });
    }

    const statement = db.prepare(
      'INSERT INTO devotionals (verse, content) VALUES (?, ?)'
    );
    const result = statement.run(verse, content);

    res.status(201).json({ message: 'Devotional created successfully.', id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create devotional.' });
  }
});

//Soft delete a devotional
app.delete('/api/devotionals/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const statement = db.prepare(
      'UPDATE devotionals SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL'
    );
    const result = statement.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Devotional not found or already deleted.' });
    }

    res.status(204).send(); // No content
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete devotional.' });
  }
});



app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
