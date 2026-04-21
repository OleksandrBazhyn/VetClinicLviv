import { getDatabase } from './database';
import AsyncStorage from '@react-native-async-storage/async-storage';

function toBoolean(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function normalizeUser(user) {
  if (!user) return null;

  return {
    ...user,
    subscription_active: toBoolean(user.subscription_active),
  };
}

function simpleHash(password) {
  const encoded = password
    .split('')
    .map((char, index) => char.charCodeAt(0) ^ (index % 7))
    .join('.');

  return btoa(encoded);
}

function generateToken(userId, email) {
  const payload = { userId, email, exp: Date.now() + 86400000 };
  return btoa(JSON.stringify(payload));
}

export async function register(name, email, password) {
  const db = await getDatabase();

  const existing = await db.getFirstAsync('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) throw new Error('Користувач з таким email вже існує');

  const hash = simpleHash(password);
  const result = await db.runAsync(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    [name, email, hash]
  );

  const token = generateToken(result.lastInsertRowId, email);
  const user = normalizeUser({
    id: result.lastInsertRowId,
    name,
    email,
    role: 'user',
    subscription_active: 0,
  });

  await AsyncStorage.setItem('auth_token', token);
  await AsyncStorage.setItem('user_data', JSON.stringify(user));

  return user;
}

export async function login(email, password) {
  const db = await getDatabase();

  const user = await db.getFirstAsync('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) throw new Error('Невірний email або пароль');

  const hash = simpleHash(password);
  if (hash !== user.password_hash) throw new Error('Невірний email або пароль');

  const token = generateToken(user.id, user.email);
  const userData = normalizeUser({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    subscription_active: user.subscription_active,
  });

  await AsyncStorage.setItem('auth_token', token);
  await AsyncStorage.setItem('user_data', JSON.stringify(userData));

  return userData;
}

export async function logout() {
  await AsyncStorage.removeItem('auth_token');
  await AsyncStorage.removeItem('user_data');
}

export async function getCurrentUser() {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) return null;

    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) {
      await logout();
      return null;
    }

    const userData = await AsyncStorage.getItem('user_data');
    return userData ? normalizeUser(JSON.parse(userData)) : null;
  } catch {
    return null;
  }
}

export async function updateProfile(userId, name) {
  const db = await getDatabase();
  await db.runAsync('UPDATE users SET name = ? WHERE id = ?', [name, userId]);

  const userData = await AsyncStorage.getItem('user_data');
  if (userData) {
    const parsed = normalizeUser(JSON.parse(userData));
    parsed.name = name;
    await AsyncStorage.setItem('user_data', JSON.stringify(parsed));
  }
}

export async function activateSubscription(userId) {
  const db = await getDatabase();
  await db.runAsync('UPDATE users SET subscription_active = 1 WHERE id = ?', [userId]);

  const userData = await AsyncStorage.getItem('user_data');
  if (userData) {
    const parsed = normalizeUser(JSON.parse(userData));
    parsed.subscription_active = true;
    await AsyncStorage.setItem('user_data', JSON.stringify(parsed));
    return parsed;
  }

  return null;
}
