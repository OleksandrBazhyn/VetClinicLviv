import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  readFavorites,
  removeFavorite,
  clearFavorites,
  exportClinicsToFile,
  getFileInfo,
  readRawFile,
  FAVORITES_FILE_PATH,
  EXPORT_FILE_PATH,
} from '../services/fileService';
import { getAllClinics } from '../db/clinicService';
import { COLORS } from '../constants';

function FileInfoCard({ title, filePath, info, onRefresh }) {
  const shortPath = filePath?.replace('file://', '').replace(/^.*\/(Documents|documents)\//, 'documents/');
  return (
    <View style={styles.fileCard}>
      <View style={styles.fileCardHeader}>
        <Text style={styles.fileCardIcon}>📂</Text>
        <Text style={styles.fileCardTitle}>{title}</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>↻</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.filePath} numberOfLines={2}>{shortPath}</Text>
      {info ? (
        <View style={styles.fileStats}>
          <View style={styles.fileStat}>
            <Text style={styles.fileStatLabel}>Розмір</Text>
            <Text style={styles.fileStatValue}>{info.size} байт</Text>
          </View>
          <View style={styles.fileStat}>
            <Text style={styles.fileStatLabel}>Статус</Text>
            <Text style={[styles.fileStatValue, { color: COLORS.success }]}>✓ існує</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.fileNotExist}>⚠ Файл не створено</Text>
      )}
    </View>
  );
}

export default function FavoritesScreen({ navigation }) {
  const [favorites, setFavorites] = useState([]);
  const [favFileInfo, setFavFileInfo] = useState(null);
  const [exportFileInfo, setExportFileInfo] = useState(null);
  const [rawContent, setRawContent] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    // ── Читання файлу улюблених ──
    const favs = await readFavorites();
    setFavorites(favs);

    // ── Метадані файлу ──
    const [fi, ei] = await Promise.all([
      getFileInfo(FAVORITES_FILE_PATH),
      getFileInfo(EXPORT_FILE_PATH),
    ]);
    setFavFileInfo(fi);
    setExportFileInfo(ei);

    // ── Сирий вміст файлу ──
    const raw = await readRawFile(FAVORITES_FILE_PATH);
    setRawContent(raw);
    setLoading(false);
  }, []);

  useFocusEffect(loadAll);

  // ── Видалення одного улюбленого (перезапис файлу) ──
  async function handleRemove(clinicId, clinicName) {
    Alert.alert(
      'Видалити з улюблених?',
      clinicName,
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Видалити',
          style: 'destructive',
          onPress: async () => {
            await removeFavorite(clinicId);
            await loadAll();
          },
        },
      ]
    );
  }

  // ── Очистити весь файл ──
  async function handleClear() {
    Alert.alert(
      'Очистити всі улюблені?',
      'Файл favorites.json буде перезаписано порожнім масивом.',
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Очистити',
          style: 'destructive',
          onPress: async () => {
            await clearFavorites();
            await loadAll();
          },
        },
      ]
    );
  }

  // ── Експорт всіх клінік у JSON-файл ──
  async function handleExport() {
    setExporting(true);
    try {
      const clinics = await getAllClinics();
      await exportClinicsToFile(clinics);
      await loadAll();
      Alert.alert(
        '✅ Файл збережено',
        `clinics_export.json\n${clinics.length} клінік експортовано`,
        [{ text: 'OK' }]
      );
    } catch (e) {
      Alert.alert('Помилка', String(e));
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1 }} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 36 }}>
      <Text style={styles.pageTitle}>📁 Робота з файлами</Text>

      {/* ── Інформація про файл улюблених ── */}
      <FileInfoCard
        title="favorites.json"
        filePath={FAVORITES_FILE_PATH}
        info={favFileInfo}
        onRefresh={loadAll}
      />

      {/* ── Вміст файлу (сирий JSON) ── */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.rawToggle}
          onPress={() => setShowRaw(!showRaw)}
        >
          <Text style={styles.rawToggleText}>
            {showRaw ? '▼' : '▶'} Вміст файлу (JSON)
          </Text>
        </TouchableOpacity>
        {showRaw && (
          <View style={styles.rawBox}>
            <Text style={styles.rawText} selectable>
              {rawContent
                ? JSON.stringify(JSON.parse(rawContent), null, 2)
                : '[ файл порожній або не існує ]'}
            </Text>
          </View>
        )}
      </View>

      {/* ── Список улюблених (зчитано з файлу) ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>❤️ Улюблені клініки ({favorites.length})</Text>
          {favorites.length > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <Text style={styles.clearBtn}>Очистити</Text>
            </TouchableOpacity>
          )}
        </View>

        {favorites.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>💔</Text>
            <Text style={styles.emptyText}>Немає збережених клінік.</Text>
            <Text style={styles.emptyHint}>
              Відкрийте профіль будь-якої клініки і натисніть 🤍
            </Text>
          </View>
        ) : (
          favorites.map((fav, index) => (
            <View key={fav.id} style={styles.favRow}>
              <View style={styles.favIndex}>
                <Text style={styles.favIndexText}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.favName}>{fav.name}</Text>
                <Text style={styles.favAddr} numberOfLines={1}>{fav.address}</Text>
                <Text style={styles.favRating}>★ {fav.rating?.toFixed(1) ?? '—'}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRemove(fav.id, fav.name)}
                style={styles.removeBtn}
              >
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* ── Кнопка запису нового файлу ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💾 Експорт клінік</Text>
        <Text style={styles.exportDesc}>
          Записує всі клініки з бази даних у файл{'\n'}
          <Text style={styles.exportFilename}>clinics_export.json</Text>
        </Text>

        <FileInfoCard
          title="clinics_export.json"
          filePath={EXPORT_FILE_PATH}
          info={exportFileInfo}
          onRefresh={loadAll}
        />

        <TouchableOpacity
          style={[styles.exportBtn, exporting && { opacity: 0.6 }]}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.exportBtnText}>💾 Зберегти у файл</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  pageTitle: {
    fontSize: 22, fontWeight: '800', color: COLORS.text,
    padding: 16, paddingBottom: 8,
  },

  // Картка файлу
  fileCard: {
    backgroundColor: COLORS.card, borderRadius: 14,
    marginHorizontal: 16, marginBottom: 12, padding: 14,
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4,
  },
  fileCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  fileCardIcon: { fontSize: 18 },
  fileCardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.text, fontFamily: 'monospace' },
  refreshBtn: { padding: 4 },
  refreshText: { fontSize: 18, color: COLORS.primary },
  filePath: {
    fontSize: 11, color: COLORS.textSecondary,
    fontFamily: 'monospace', marginBottom: 8,
    backgroundColor: '#f5f5f5', borderRadius: 6, padding: 6,
  },
  fileStats: { flexDirection: 'row', gap: 16 },
  fileStat: { alignItems: 'center' },
  fileStatLabel: { fontSize: 10, color: COLORS.textSecondary, marginBottom: 2 },
  fileStatValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  fileNotExist: { fontSize: 13, color: COLORS.warning },

  // Секції
  section: { marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  clearBtn: { fontSize: 13, color: COLORS.danger, fontWeight: '600' },

  // Сирий JSON
  rawToggle: {
    marginHorizontal: 16, marginBottom: 4,
    backgroundColor: COLORS.card, borderRadius: 10,
    padding: 12, elevation: 1,
  },
  rawToggleText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  rawBox: {
    marginHorizontal: 16, backgroundColor: '#1e1e2e',
    borderRadius: 10, padding: 12, marginBottom: 8,
  },
  rawText: { fontSize: 11, color: '#a6e3a1', fontFamily: 'monospace', lineHeight: 18 },

  // Список улюблених
  emptyBox: { alignItems: 'center', paddingVertical: 24 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },
  emptyHint: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },

  favRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: COLORS.card, borderRadius: 12, padding: 12,
    elevation: 1,
  },
  favIndex: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  favIndexText: { fontSize: 13, fontWeight: '800', color: COLORS.danger },
  favName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  favAddr: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  favRating: { fontSize: 12, color: COLORS.star, fontWeight: '600', marginTop: 2 },
  removeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center',
    marginLeft: 8,
  },
  removeBtnText: { color: COLORS.danger, fontWeight: '700', fontSize: 14 },

  // Експорт
  exportDesc: { fontSize: 13, color: COLORS.textSecondary, paddingHorizontal: 16, marginBottom: 10, lineHeight: 20 },
  exportFilename: { fontFamily: 'monospace', color: COLORS.primary, fontWeight: '600' },
  exportBtn: {
    marginHorizontal: 16, backgroundColor: COLORS.primary,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  exportBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
