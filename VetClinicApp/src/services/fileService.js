import * as FileSystem from 'expo-file-system';

const FAVORITES_FILE = FileSystem.documentDirectory + 'favorites.json';

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
  const filePath = FileSystem.documentDirectory + 'clinics_export.json';
  const data = clinics.map(c => ({
    id: c.id,
    name: c.name,
    address: c.address,
    district: c.district,
    phone: c.phone,
    is_24_7: !!c.is_24_7,
    rating: c.rating,
  }));
  await FileSystem.writeAsStringAsync(filePath, JSON.stringify({ exported_at: new Date().toISOString(), clinics: data }, null, 2));
  return filePath;
}
