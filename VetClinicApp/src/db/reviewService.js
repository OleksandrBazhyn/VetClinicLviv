import { getDatabase } from './database';

export async function addReview(userId, clinicId, rating, text) {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO reviews (user_id, clinic_id, rating, text) VALUES (?, ?, ?, ?)`,
    [userId, clinicId, rating, text]
  );

  const stats = await db.getFirstAsync(
    `SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE clinic_id = ? AND status = 'visible'`,
    [clinicId]
  );

  await db.runAsync(
    `UPDATE clinics SET rating = ?, review_count = ? WHERE id = ?`,
    [Math.round(stats.avg_rating * 10) / 10, stats.count, clinicId]
  );
}

export async function deleteReview(reviewId, userId) {
  const db = await getDatabase();

  const review = await db.getFirstAsync(
    `SELECT * FROM reviews WHERE id = ? AND user_id = ?`,
    [reviewId, userId]
  );
  if (!review) throw new Error('Відгук не знайдено');

  await db.runAsync(`DELETE FROM reviews WHERE id = ?`, [reviewId]);

  const stats = await db.getFirstAsync(
    `SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE clinic_id = ? AND status = 'visible'`,
    [review.clinic_id]
  );

  await db.runAsync(
    `UPDATE clinics SET rating = ?, review_count = ? WHERE id = ?`,
    [stats.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : 0, stats.count, review.clinic_id]
  );
}

// Admin: модерація відгуків

export async function getAllReviewsForModeration() {
  const db = await getDatabase();
  return db.getAllAsync(
    `SELECT r.*, u.name as user_name, c.name as clinic_name
     FROM reviews r
     JOIN users u ON r.user_id = u.id
     JOIN clinics c ON r.clinic_id = c.id
     ORDER BY r.created_at DESC`
  );
}

export async function moderateReview(reviewId, action) {
  // action: 'visible' | 'rejected'
  const db = await getDatabase();
  await db.runAsync(`UPDATE reviews SET status = ? WHERE id = ?`, [action, reviewId]);

  const review = await db.getFirstAsync(`SELECT clinic_id FROM reviews WHERE id = ?`, [reviewId]);
  if (review) {
    const stats = await db.getFirstAsync(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE clinic_id = ? AND status = 'visible'`,
      [review.clinic_id]
    );
    await db.runAsync(
      `UPDATE clinics SET rating = ?, review_count = ? WHERE id = ?`,
      [stats.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : 0, stats.count, review.clinic_id]
    );
  }
}
