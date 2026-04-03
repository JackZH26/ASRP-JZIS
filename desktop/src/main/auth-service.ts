import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import { app } from 'electron';

const JWT_SECRET = 'asrp-desktop-local-jwt-secret-2026';
const SALT_ROUNDS = 10;

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
  setup_complete: number;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: { id: number; name: string; email: string };
  error?: string;
}

export interface UserProfile {
  researchArea: string;
  specificTopic: string;
  paperName: string;
  institution: string;
}

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  const dbPath = path.join(app.getPath('userData'), 'asrp-auth.db');
  db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      setup_complete INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      research_area TEXT DEFAULT '',
      specific_topic TEXT DEFAULT '',
      paper_name TEXT DEFAULT '',
      institution TEXT DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

export function register(name: string, email: string, password: string): AuthResult {
  try {
    const database = getDb();
    const existing = database.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return { success: false, error: 'Email already registered' };
    }

    const hash = bcrypt.hashSync(password, SALT_ROUNDS);
    const result = database.prepare(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
    ).run(name, email, hash);

    const userId = result.lastInsertRowid as number;
    const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '30d' });

    return { success: true, token, user: { id: userId, name, email } };
  } catch (err: unknown) {
    return { success: false, error: String(err) };
  }
}

export function login(email: string, password: string): AuthResult {
  try {
    const database = getDb();
    const user = database.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRecord | undefined;

    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return { success: false, error: 'Invalid email or password' };
    }

    const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '30d' });
    return {
      success: true,
      token,
      user: { id: user.id, name: user.name, email },
    };
  } catch (err: unknown) {
    return { success: false, error: String(err) };
  }
}

export function getUser(token: string): { id: number; name: string; email: string; setupComplete: boolean } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
    const database = getDb();
    const user = database.prepare(
      'SELECT id, name, email, setup_complete FROM users WHERE id = ?'
    ).get(decoded.id) as UserRecord | undefined;

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      setupComplete: user.setup_complete === 1,
    };
  } catch {
    return null;
  }
}

export function isSetupComplete(userId: number): boolean {
  const database = getDb();
  const user = database.prepare('SELECT setup_complete FROM users WHERE id = ?').get(userId) as
    | { setup_complete: number }
    | undefined;
  return user?.setup_complete === 1;
}

export function markSetupComplete(userId: number): void {
  const database = getDb();
  database.prepare('UPDATE users SET setup_complete = 1 WHERE id = ?').run(userId);
}

export function saveProfile(userId: number, profile: UserProfile): void {
  const database = getDb();
  database.prepare(`
    INSERT INTO user_profiles (user_id, research_area, specific_topic, paper_name, institution, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      research_area = excluded.research_area,
      specific_topic = excluded.specific_topic,
      paper_name = excluded.paper_name,
      institution = excluded.institution,
      updated_at = excluded.updated_at
  `).run(userId, profile.researchArea, profile.specificTopic, profile.paperName, profile.institution);
}

export function getAuthDb(): Database.Database {
  return getDb();
}
