import * as SQLite from 'expo-sqlite';
import clinicsData from '../assets/data/clinics.json';

let db;

export async function getDatabase() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('vetclinic.db');
  }
  return db;
}

export async function initDatabase() {
  const database = await getDatabase();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      subscription_active INTEGER NOT NULL DEFAULT 0,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clinics (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      district TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      phone TEXT,
      website TEXT,
      is_24_7 INTEGER NOT NULL DEFAULT 0,
      rating REAL NOT NULL DEFAULT 0,
      review_count INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS clinics_fts USING fts5(
      name,
      address,
      district,
      content='clinics',
      content_rowid='id'
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinic_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'other',
      FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS working_hours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinic_id INTEGER NOT NULL,
      day TEXT NOT NULL,
      time TEXT NOT NULL,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      clinic_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'visible',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (clinic_id) REFERENCES clinics(id)
    );

    CREATE TABLE IF NOT EXISTS emergency_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      pet_type TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'created',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  await seedClinics(database);
  await seedUsers(database);
}

function simpleHash(password) {
  const encoded = password
    .split('')
    .map((char, index) => char.charCodeAt(0) ^ (index % 7))
    .join('.');
  return btoa(encoded);
}

async function seedUsers(database) {
  const testUsers = [
    { name: 'Тестовий Користувач', email: 'user@test.com',   password: 'test123',   role: 'user',        subscription_active: 1 },
    { name: 'Власник клініки',     email: 'clinic@test.com', password: 'clinic123', role: 'clinic_rep',  subscription_active: 0 },
    { name: 'Адміністратор',       email: 'admin@test.com',  password: 'admin123',  role: 'admin',       subscription_active: 1 },
  ];

  for (const u of testUsers) {
    await database.runAsync(
      `INSERT OR IGNORE INTO users (name, email, password_hash, role, subscription_active) VALUES (?, ?, ?, ?, ?)`,
      [u.name, u.email, simpleHash(u.password), u.role, u.subscription_active]
    );
  }
}

async function seedClinics(database) {
  const existing = await database.getFirstAsync('SELECT COUNT(*) as count FROM clinics');
  if (existing.count > 0) return;

  for (const clinic of clinicsData.clinics) {
    await database.runAsync(
      `INSERT INTO clinics (id, name, address, district, latitude, longitude, phone, website, is_24_7, rating, review_count, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clinic.id,
        clinic.name,
        clinic.address,
        clinic.district,
        clinic.latitude,
        clinic.longitude,
        clinic.phone,
        clinic.website || '',
        clinic.is_24_7 ? 1 : 0,
        clinic.rating,
        clinic.review_count,
        clinic.description || '',
      ]
    );

    await database.runAsync(
      `INSERT INTO clinics_fts (rowid, name, address, district) VALUES (?, ?, ?, ?)`,
      [clinic.id, clinic.name, clinic.address, clinic.district]
    );

    for (const service of clinic.services) {
      await database.runAsync(
        `INSERT INTO services (clinic_id, name, price, category) VALUES (?, ?, ?, ?)`,
        [clinic.id, service.name, service.price, service.category]
      );
    }

    for (const wh of clinic.working_hours) {
      await database.runAsync(
        `INSERT INTO working_hours (clinic_id, day, time) VALUES (?, ?, ?)`,
        [clinic.id, wh.day, wh.time]
      );
    }
  }
}
