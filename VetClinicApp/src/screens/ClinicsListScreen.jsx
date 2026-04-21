import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, Switch, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllClinics } from '../db/clinicService';
import ClinicCard from '../components/ClinicCard';
import { COLORS, DISTRICTS, SERVICE_CATEGORIES } from '../constants';

export default function ClinicsListScreen({ navigation }) {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [filterDistrict, setFilterDistrict] = useState('');
  const [filter24_7, setFilter24_7] = useState(false);
  const [filterRating, setFilterRating] = useState(0);
  const [filterCategories, setFilterCategories] = useState([]);

  const loadClinics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllClinics({
        search,
        district: filterDistrict === 'Всі райони' ? '' : filterDistrict,
        only24_7: filter24_7,
        minRating: filterRating,
        serviceCategories: filterCategories,
      });
      setClinics(data);
    } finally {
      setLoading(false);
    }
  }, [search, filterDistrict, filter24_7, filterRating, filterCategories]);

  useFocusEffect(useCallback(() => { loadClinics(); }, [loadClinics]));

  function toggleCategory(key) {
    setFilterCategories(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  const activeFiltersCount = [
    filterDistrict && filterDistrict !== 'Всі райони',
    filter24_7,
    filterRating > 0,
    filterCategories.length > 0,
  ].filter(Boolean).length;

  return (
    <View style={styles.container}>
      {/* Пошук */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Пошук клінік..."
            placeholderTextColor={COLORS.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={[styles.filterBtn, activeFiltersCount > 0 && styles.filterBtnActive]} onPress={() => setShowFilters(true)}>
          <Text style={styles.filterIcon}>⚙️</Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFiltersCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {/* Кількість результатів */}
      {!loading && (
        <Text style={styles.resultsCount}>
          Знайдено: {clinics.length} {clinics.length === 1 ? 'клініка' : clinics.length < 5 ? 'клініки' : 'клінік'}
        </Text>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={clinics}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <ClinicCard
              clinic={item}
              onPress={() => navigation.navigate('ClinicProfile', { clinicId: item.id })}
            />
          )}
          contentContainerStyle={{ paddingVertical: 8 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏥</Text>
              <Text style={styles.emptyText}>Клінік не знайдено</Text>
              <Text style={styles.emptyHint}>Спробуйте змінити пошуковий запит або фільтри</Text>
            </View>
          }
        />
      )}

      {/* Модальне вікно фільтрів */}
      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Фільтри</Text>

            {/* Перемикач 24/7 */}
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Тільки цілодобові</Text>
              <Switch
                value={filter24_7}
                onValueChange={setFilter24_7}
                trackColor={{ true: COLORS.primary }}
                thumbColor={filter24_7 ? COLORS.primaryLight : '#ccc'}
              />
            </View>

            {/* Район — радіо-кнопки */}
            <Text style={styles.filterLabel}>Район</Text>
            <ScrollView style={styles.districtList} nestedScrollEnabled>
              {DISTRICTS.map(d => (
                <TouchableOpacity
                  key={d}
                  style={styles.radioRow}
                  onPress={() => setFilterDistrict(d === 'Всі райони' ? '' : d)}
                >
                  <View style={[styles.radio, (filterDistrict === d || (d === 'Всі райони' && !filterDistrict)) && styles.radioSelected]} />
                  <Text style={styles.radioLabel}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Мінімальний рейтинг — чекбокси */}
            <Text style={styles.filterLabel}>Мінімальний рейтинг</Text>
            <View style={styles.ratingRow}>
              {[0, 3, 4, 4.5].map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.ratingChip, filterRating === r && styles.ratingChipActive]}
                  onPress={() => setFilterRating(r)}
                >
                  <Text style={[styles.ratingChipText, filterRating === r && styles.ratingChipTextActive]}>
                    {r === 0 ? 'Будь-який' : `${r}+`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Категорії послуг */}
            <Text style={styles.filterLabel}>Послуги</Text>
            <View style={styles.categoriesGrid}>
              {Object.entries(SERVICE_CATEGORIES).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.categoryChip, filterCategories.includes(key) && styles.categoryChipActive]}
                  onPress={() => toggleCategory(key)}
                >
                  <Text style={[styles.categoryChipText, filterCategories.includes(key) && styles.categoryChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.resetBtn} onPress={() => {
                setFilterDistrict(''); setFilter24_7(false); setFilterRating(0); setFilterCategories([]);
              }}>
                <Text style={styles.resetBtnText}>Скинути</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilters(false)}>
                <Text style={styles.applyBtnText}>Застосувати</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchRow: { flexDirection: 'row', padding: 12, gap: 8 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 10,
    paddingHorizontal: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  searchIcon: { fontSize: 16, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text, paddingVertical: 10 },
  clearIcon: { fontSize: 16, color: COLORS.textSecondary, padding: 4 },
  filterBtn: {
    width: 46, height: 46, borderRadius: 10, backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  filterIcon: { fontSize: 20 },
  filterBadge: {
    position: 'absolute', top: 4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.danger, justifyContent: 'center', alignItems: 'center',
  },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  resultsCount: { paddingHorizontal: 16, fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  emptyHint: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '80%',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  filterLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 4 },
  districtList: { maxHeight: 180, marginBottom: 8 },
  radioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: COLORS.border, marginRight: 10 },
  radioSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  radioLabel: { fontSize: 14, color: COLORS.text },
  ratingRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  ratingChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background,
  },
  ratingChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  ratingChipText: { fontSize: 13, color: COLORS.text },
  ratingChipTextActive: { color: '#fff', fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  resetBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  resetBtnText: { fontSize: 15, color: COLORS.text },
  applyBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: COLORS.primary, alignItems: 'center',
  },
  applyBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background,
  },
  categoryChipActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primaryLight },
  categoryChipText: { fontSize: 13, color: COLORS.text },
  categoryChipTextActive: { color: '#fff', fontWeight: '600' },
});
