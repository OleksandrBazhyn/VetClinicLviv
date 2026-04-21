import { getDatabase } from './database';

function toBoolean(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function normalizeClinic(clinic) {
  if (!clinic) return clinic;

  return {
    ...clinic,
    latitude: typeof clinic.latitude === 'number' ? clinic.latitude : Number(clinic.latitude),
    longitude: typeof clinic.longitude === 'number' ? clinic.longitude : Number(clinic.longitude),
    rating: typeof clinic.rating === 'number' ? clinic.rating : Number(clinic.rating || 0),
    review_count: typeof clinic.review_count === 'number' ? clinic.review_count : Number(clinic.review_count || 0),
    is_24_7: toBoolean(clinic.is_24_7),
  };
}

export async function getAllClinics({
  search = '',
  district = '',
  only24_7 = false,
  minRating = 0,
  serviceCategories = [],
} = {}) {
  const db = await getDatabase();

  const hasServiceFilter = serviceCategories.length > 0;
  const placeholders = hasServiceFilter ? serviceCategories.map(() => '?').join(',') : '';

  if (search.trim().length > 0) {
    const ftsQuery = `${search.trim()}*`;
    let query;
    let params;

    if (hasServiceFilter) {
      query = `SELECT DISTINCT c.* FROM clinics c
               JOIN clinics_fts fts ON c.id = fts.rowid
               JOIN services s ON c.id = s.clinic_id
               WHERE clinics_fts MATCH ?
                 AND (? = '' OR c.district = ?)
                 AND (? = 0 OR c.is_24_7 = 1)
                 AND c.rating >= ?
                 AND s.category IN (${placeholders})
               ORDER BY c.rating DESC`;
      params = [ftsQuery, district, district, only24_7 ? 1 : 0, minRating, ...serviceCategories];
    } else {
      query = `SELECT c.* FROM clinics c
               JOIN clinics_fts fts ON c.id = fts.rowid
               WHERE clinics_fts MATCH ?
                 AND (? = '' OR c.district = ?)
                 AND (? = 0 OR c.is_24_7 = 1)
                 AND c.rating >= ?
               ORDER BY c.rating DESC`;
      params = [ftsQuery, district, district, only24_7 ? 1 : 0, minRating];
    }
    const clinics = await db.getAllAsync(query, params);
    return clinics.map(normalizeClinic);
  }

  let query;
  let params;

  if (hasServiceFilter) {
    query = `SELECT DISTINCT c.* FROM clinics c
             JOIN services s ON c.id = s.clinic_id
             WHERE (? = '' OR c.district = ?)
               AND (? = 0 OR c.is_24_7 = 1)
               AND c.rating >= ?
               AND s.category IN (${placeholders})
             ORDER BY c.rating DESC`;
    params = [district, district, only24_7 ? 1 : 0, minRating, ...serviceCategories];
  } else {
    query = `SELECT * FROM clinics
             WHERE (? = '' OR district = ?)
               AND (? = 0 OR is_24_7 = 1)
               AND rating >= ?
             ORDER BY rating DESC`;
    params = [district, district, only24_7 ? 1 : 0, minRating];
  }
  const clinics = await db.getAllAsync(query, params);
  return clinics.map(normalizeClinic);
}

export async function getClinicById(id) {
  const db = await getDatabase();
  const clinic = await db.getFirstAsync('SELECT * FROM clinics WHERE id = ?', [id]);
  if (!clinic) return null;

  const services = await db.getAllAsync('SELECT * FROM services WHERE clinic_id = ?', [id]);
  const workingHours = await db.getAllAsync('SELECT * FROM working_hours WHERE clinic_id = ?', [id]);
  const reviews = await db.getAllAsync(
    `SELECT r.*, u.name as user_name FROM reviews r
     JOIN users u ON r.user_id = u.id
     WHERE r.clinic_id = ? AND r.status = 'visible'
     ORDER BY r.created_at DESC`,
    [id]
  );

  return {
    ...normalizeClinic(clinic),
    services,
    workingHours,
    reviews,
  };
}

export async function getClinicsStats() {
  const db = await getDatabase();

  const byDistrict = await db.getAllAsync(
    `SELECT district, COUNT(*) as count FROM clinics GROUP BY district ORDER BY count DESC`
  );
  const availability = await db.getAllAsync(
    `SELECT is_24_7, COUNT(*) as count FROM clinics GROUP BY is_24_7`
  );
  const ratingGroups = await db.getAllAsync(
    `SELECT
       CASE
         WHEN rating >= 4.5 THEN '4.5–5.0'
         WHEN rating >= 4.0 THEN '4.0–4.5'
         WHEN rating >= 3.5 THEN '3.5–4.0'
         ELSE '< 3.5'
       END as group_label,
       COUNT(*) as count
     FROM clinics
     GROUP BY group_label
     ORDER BY group_label DESC`
  );

  return {
    byDistrict,
    availability: availability.map(item => ({ ...item, is_24_7: toBoolean(item.is_24_7) })),
    ratingGroups,
  };
}

// Admin CRUD

export async function adminAddClinic(data) {
  const db = await getDatabase();

  const result = await db.runAsync(
    `INSERT INTO clinics (name, address, district, latitude, longitude, phone, website, is_24_7, rating, review_count, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
    [data.name, data.address, data.district, data.latitude, data.longitude,
     data.phone, data.website || '', data.is_24_7 ? 1 : 0, data.description || '']
  );
  const id = result.lastInsertRowId;

  await db.runAsync(
    `INSERT INTO clinics_fts (rowid, name, address, district) VALUES (?, ?, ?, ?)`,
    [id, data.name, data.address, data.district]
  );

  if (data.workingHours?.length) {
    for (const wh of data.workingHours) {
      await db.runAsync(
        `INSERT INTO working_hours (clinic_id, day, time) VALUES (?, ?, ?)`,
        [id, wh.day, wh.time]
      );
    }
  }
  return id;
}

export async function adminUpdateClinic(id, data) {
  const db = await getDatabase();

  await db.runAsync(
    `UPDATE clinics SET name=?, address=?, district=?, latitude=?, longitude=?,
     phone=?, website=?, is_24_7=?, description=? WHERE id=?`,
    [data.name, data.address, data.district, data.latitude, data.longitude,
     data.phone, data.website || '', data.is_24_7 ? 1 : 0, data.description || '', id]
  );

  await db.runAsync(`DELETE FROM clinics_fts WHERE rowid = ?`, [id]);
  await db.runAsync(
    `INSERT INTO clinics_fts (rowid, name, address, district) VALUES (?, ?, ?, ?)`,
    [id, data.name, data.address, data.district]
  );

  await db.runAsync(`DELETE FROM working_hours WHERE clinic_id = ?`, [id]);
  if (data.workingHours?.length) {
    for (const wh of data.workingHours) {
      await db.runAsync(
        `INSERT INTO working_hours (clinic_id, day, time) VALUES (?, ?, ?)`,
        [id, wh.day, wh.time]
      );
    }
  }
}

export async function adminDeleteClinic(id) {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM clinics_fts WHERE rowid = ?`, [id]);
  await db.runAsync(`DELETE FROM services WHERE clinic_id = ?`, [id]);
  await db.runAsync(`DELETE FROM working_hours WHERE clinic_id = ?`, [id]);
  await db.runAsync(`DELETE FROM reviews WHERE clinic_id = ?`, [id]);
  await db.runAsync(`DELETE FROM clinics WHERE id = ?`, [id]);
}

export async function getAllClinicsForAdmin() {
  const db = await getDatabase();
  const clinics = await db.getAllAsync(`SELECT * FROM clinics ORDER BY name ASC`);
  return clinics.map(normalizeClinic);
}
