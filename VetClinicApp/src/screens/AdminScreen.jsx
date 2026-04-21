import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getAllClinicsForAdmin,
  adminDeleteClinic,
  getClinicById,
} from '../db/clinicService';
import { getAllReviewsForModeration, moderateReview } from '../db/reviewService';
import { COLORS } from '../constants';

export default function AdminScreen({ navigation }) {
  const [tab, setTab] = useState('clinics');

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'clinics' && styles.tabBtnActive]}
          onPress={() => setTab('clinics')}
        >
          <Text style={[styles.tabText, tab === 'clinics' && styles.tabTextActive]}>Клініки</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'reviews' && styles.tabBtnActive]}
          onPress={() => setTab('reviews')}
        >
          <Text style={[styles.tabText, tab === 'reviews' && styles.tabTextActive]}>Відгуки</Text>
        </TouchableOpacity>
      </View>

      {tab === 'clinics' ? <ClinicsTab navigation={navigation} /> : <ReviewsTab />}
    </View>
  );
}

function ClinicsTab({ navigation }) {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingClinicId, setOpeningClinicId] = useState(null);

  const loadClinics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllClinicsForAdmin();
      setClinics(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadClinics();
    }, [loadClinics])
  );

  async function handleEdit(clinic) {
    setOpeningClinicId(clinic.id);
    try {
      const fullClinic = await getClinicById(clinic.id);
      navigation.navigate('AdminClinicForm', { clinic: fullClinic ?? clinic });
    } finally {
      setOpeningClinicId(null);
    }
  }

  function handleDelete(clinic) {
    Alert.alert(
      'Видалити клініку',
      `Ви впевнені, що хочете видалити "${clinic.name}"?`,
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Видалити',
          style: 'destructive',
          onPress: async () => {
            await adminDeleteClinic(clinic.id);
            loadClinics();
          },
        },
      ]
    );
  }

  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => navigation.navigate('AdminClinicForm', { clinic: null })}
      >
        <Text style={styles.addBtnText}>+ Додати клініку</Text>
      </TouchableOpacity>

      <FlatList
        data={clinics}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 16 }}
        renderItem={({ item }) => (
          <View style={styles.clinicItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.clinicName}>{item.name}</Text>
              <Text style={styles.clinicAddr}>{item.address}</Text>
              <Text style={styles.clinicMeta}>
                {item.district} • ★ {item.rating || 0} • {item.review_count || 0} відг.
                {item.is_24_7 ? ' • 24/7' : ''}
              </Text>
            </View>
            <View style={styles.actionBtns}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => handleEdit(item)}
                disabled={openingClinicId === item.id}
              >
                {openingClinicId === item.id ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Text style={styles.editBtnText}>Ред.</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                <Text style={styles.deleteBtnText}>Del</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Клінік не знайдено</Text>}
      />
    </View>
  );
}

function ReviewsTab() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllReviewsForModeration();
      setReviews(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReviews();
    }, [loadReviews])
  );

  async function handleModerate(reviewId, action) {
    await moderateReview(reviewId, action);
    loadReviews();
  }

  const statusLabels = {
    pending: 'На перевірці',
    visible: 'Видимий',
    rejected: 'Відхилений',
  };

  const statusColors = {
    pending: COLORS.warning,
    visible: COLORS.success,
    rejected: COLORS.danger,
  };

  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />;
  }

  return (
    <FlatList
      data={reviews}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      renderItem={({ item }) => (
        <View style={styles.reviewItem}>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewUser}>{item.user_name}</Text>
            <Text style={[styles.reviewStatus, { color: statusColors[item.status] || COLORS.textSecondary }]}>
              {statusLabels[item.status] || item.status}
            </Text>
          </View>
          <Text style={styles.reviewClinic}>Клініка: {item.clinic_name}</Text>
          <Text style={styles.reviewRating}>{'★'.repeat(item.rating)} ({item.rating}/5)</Text>
          {item.text ? <Text style={styles.reviewText}>{item.text}</Text> : null}
          <Text style={styles.reviewDate}>{item.created_at?.slice(0, 16)}</Text>

          <View style={styles.moderateBtns}>
            <TouchableOpacity
              style={[styles.moderateBtn, styles.approveBtnColor]}
              onPress={() => handleModerate(item.id, 'visible')}
            >
              <Text style={styles.moderateBtnText}>Схвалити</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.moderateBtn, styles.rejectBtnColor]}
              onPress={() => handleModerate(item.id, 'rejected')}
            >
              <Text style={styles.moderateBtnText}>Відхилити</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.emptyText}>Відгуків не знайдено</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  tabTextActive: { color: COLORS.primary },
  addBtn: {
    margin: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  clinicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 12,
    marginBottom: 8,
    elevation: 1,
  },
  clinicName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  clinicAddr: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  clinicMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  actionBtns: { flexDirection: 'row', gap: 8 },
  editBtn: { minWidth: 52, padding: 8, backgroundColor: COLORS.background, borderRadius: 8, alignItems: 'center' },
  editBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  deleteBtn: { minWidth: 52, padding: 8, backgroundColor: '#FFF0F0', borderRadius: 8, alignItems: 'center' },
  deleteBtnText: { fontSize: 13, color: COLORS.danger, fontWeight: '700' },
  reviewItem: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewUser: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  reviewStatus: { fontSize: 12, fontWeight: '600' },
  reviewClinic: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  reviewRating: { fontSize: 13, marginBottom: 4, color: COLORS.text },
  reviewText: { fontSize: 13, color: COLORS.text, marginBottom: 4, lineHeight: 18 },
  reviewDate: { fontSize: 11, color: COLORS.textSecondary },
  moderateBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  moderateBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  approveBtnColor: { backgroundColor: COLORS.success },
  rejectBtnColor: { backgroundColor: COLORS.danger },
  moderateBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40, fontSize: 15 },
});
