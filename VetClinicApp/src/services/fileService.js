import * as FileSystem from 'expo-file-system';

const FAVORITES_FILE = FileSystem.documentDirectory + 'favorites.json';
export const FAVORITES_FILE_PATH = FAVORITES_FILE;
export const EXPORT_FILE_PATH    = FileSystem.documentDirectory + 'clinics_export.json';

export async function readFavorites() {
  try {
    const info = await FileSystem.getInfoAsync(FAVORITES_FILE);
    if (!info.exists) return [];
    const content = await FileSystem.readAsStringAsync(FAVORITES_FILE);
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export async function saveFavorite(clinic) {
  const favorites = await readFavorites();
  if (favorites.find(f => f.id === clinic.id)) return favorites;
  const updated = [...favorites, { id: clinic.id, name: clinic.name, address: clinic.address, rating: clinic.rating }];
  await FileSystem.writeAsStringAsync(FAVORITES_FILE, JSON.stringify(updated));
  return updated;
}

export async function removeFavorite(clinicId) {
  const favorites = await readFavorites();
  const updated = favorites.filter(f => f.id !== clinicId);
  await FileSystem.writeAsStringAsync(FAVORITES_FILE, JSON.stringify(updated));
  return updated;
}

export async function isFavorite(clinicId) {
  const favorites = await readFavorites();
  return favorites.some(f => f.id === clinicId);
}

export async function exportClinicsToFile(clinics) {
  const data = clinics.map(c => ({
    id: c.id,
    name: c.name,
    address: c.address,
    district: c.district,
    phone: c.phone,
    is_24_7: !!c.is_24_7,
    rating: c.rating,
  }));
  const content = JSON.stringify({ exported_at: new Date().toISOString(), clinics: data }, null, 2);
  await FileSystem.writeAsStringAsync(EXPORT_FILE_PATH, content);
  return EXPORT_FILE_PATH;
}

export async function clearFavorites() {
  await FileSystem.writeAsStringAsync(FAVORITES_FILE, JSON.stringify([]));
}

export async function getFileInfo(filePath) {
  try {
    const info = await FileSystem.getInfoAsync(filePath, { size: true, md5: false });
    if (!info.exists) return null;
    return {
      exists: true,
      size: info.size ?? 0,
      uri: info.uri,
    };
  } catch {
    return null;
  }
}

export async function readRawFile(filePath) {
  try {
    const info = await FileSystem.getInfoAsync(filePath);
    if (!info.exists) return null;
    return await FileSystem.readAsStringAsync(filePath);
  } catch {
    return null;
  }
}
