import { getDatabase } from '../db/database';

export async function createEmergencyCall(userId, latitude, longitude, petType, description) {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO emergency_calls (user_id, latitude, longitude, pet_type, description)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, latitude, longitude, petType, description]
  );
  return result.lastInsertRowId;
}

export async function getUserEmergencyCalls(userId) {
  const db = await getDatabase();
  return db.getAllAsync(
    `SELECT * FROM emergency_calls WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
}

export async function updateCallStatus(callId, status) {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE emergency_calls SET status = ?, updated_at = datetime('now') WHERE id = ?`,
    [status, callId]
  );
}
