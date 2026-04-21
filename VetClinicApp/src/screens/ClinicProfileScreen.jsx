import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Linking, ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getClinicById } from '../db/clinicService';
import { addReview, deleteReview } from '../db/reviewService';
import { saveFavorite, removeFavorite, isFavorite } from '../services/fileService';
import StarRating from '../components/StarRating';
import { COLORS, SERVICE_CATEGORIES } from '../constants';

export default function ClinicProfileScreen({ route, navigation }) {
  const { clinicId } = route.params;
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorite, setFavorite] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    (async () => {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) setCurrentUser(JSON.parse(userData));
    })();
  }, []);

  const loadClinic = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getClinicById(clinicId);
      setClinic(data);
      const fav = await isFavorite(clinicId);
      setFavorite(fav);
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => { loadClinic(); }, [loadClinic]);

  async function toggleFavorite() {
    if (favorite) {
      await removeFavorite(clinicId);
    } else {
      await saveFavorite(clinic);
    }
    setFavorite(!favorite);
  }

  async function submitReview() {
    if (!currentUser) {
      Alert.alert('Потрібна авторизація', 'Увійдіть, щоб залишити відгук', [
        { text: 'Скасувати' },
        { text: 'Увійти', onPress: () => navigation.navigate('Auth') },
      ]);
      return;
    }
    if (reviewText.trim().length < 5) {
      Alert.alert('Помилка', 'Відгук повинен містити щонайменше 5 символів');
      return;
    }
    await addReview(currentUser.id, clinicId, reviewRating, reviewText.trim());
    setShowReviewModal(false);
    setReviewText('');
    setReviewRating(5);
    await loadClinic();
  }

  async function handleDeleteReview(reviewId) {
    Alert.alert('Видалити відгук?', '', [
      { text: 'Скасувати' },
      {
        text: 'Видалити',
        style: 'destructive',
        onPress: async () => {
          await deleteReview(reviewId, currentUser.id);
          await loadClinic();
        },
      },
    ]);
  }

  if (loading) return <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1 }} />;
  if (!clinic) return <View style={styles.container}><Text>Клініку не знайдено</Text></View>;

  const servicesByCategory = clinic.services.reduce((acc, s) => {
    const cat = s.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Заголовок */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.clinicName}>{clinic.name}</Text>
            <Text style={styles.district}>{clinic.district} район</Text>
          </View>
          <TouchableOpacity onPress={toggleFavorite} style={styles.favoriteBtn}>
            <Text style={{ fontSize: 28 }}>{favorite ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        </View>

        {clinic.is_24_7 && (
          <View style={styles.badge24}><Text style={styles.badge24Text}>🕐 Цілодобово</Text></View>
        )}

        {/* Рейтинг */}
        <View style={styles.ratingBlock}>
          <StarRating rating={Math.round(clinic.rating)} readonly size={24} />
          <Text style={styles.ratingValue}>{clinic.rating.toFixed(1)}</Text>
          <Text style={styles.reviewCount}>({clinic.review_count} відгуків)</Text>
        </View>

        <View style={styles.divider} />

        {/* Контакти */}
        <Text style={styles.sectionTitle}>Контактна інформація</Text>
        <TouchableOpacity onPress={() => Linking.openURL(`tel:${clinic.phone}`)}>
          <Text style={styles.contactRow}>📞 {clinic.phone}</Text>
        </TouchableOpacity>
        <Text style={styles.contactRow}>📍 {clinic.address}</Text>
        {clinic.website ? (
          <TouchableOpacity onPress={() => Linking.openURL(clinic.website)}>
            <Text style={[styles.contactRow, styles.link]}>🌐 {clinic.website}</Text>
          </TouchableOpacity>
        ) : null}
        {clinic.description ? <Text style={styles.description}>{clinic.description}</Text> : null}

        <View style={styles.divider} />

        {/* Графік роботи */}
        <Text style={styles.sectionTitle}>Графік роботи</Text>
        {clinic.workingHours.map((wh, i) => (
          <View key={i} style={styles.whRow}>
            <Text style={styles.whDay}>{wh.day}</Text>
            <Text style={styles.whTime}>{wh.time}</Text>
          </View>
        ))}

        <View style={styles.divider} />

        {/* Послуги */}
        <Text style={styles.sectionTitle}>Послуги та ціни</Text>
        {Object.entries(servicesByCategory).map(([cat, services]) => (
          <View key={cat} style={styles.categoryBlock}>
            <Text style={styles.categoryLabel}>{SERVICE_CATEGORIES[cat] || cat}</Text>
            {services.map((s, i) => (
              <View key={i} style={styles.serviceRow}>
                <Text style={styles.serviceName}>{s.name}</Text>
                <Text style={styles.servicePrice}>{s.price} грн</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.divider} />

        {/* Відгуки */}
        <View style={styles.reviewsHeader}>
          <Text style={styles.sectionTitle}>Відгуки ({clinic.reviews.length})</Text>
          <TouchableOpacity style={styles.addReviewBtn} onPress={() => setShowReviewModal(true)}>
            <Text style={styles.addReviewBtnText}>+ Додати відгук</Text>
          </TouchableOpacity>
        </View>

        {clinic.reviews.length === 0 && (
          <Text style={styles.noReviews}>Відгуків поки немає. Будьте першим!</Text>
        )}
        {clinic.reviews.map(review => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewAuthor}>{review.user_name}</Text>
              <StarRating rating={review.rating} readonly size={14} />
              {currentUser?.id === review.user_id && (
                <TouchableOpacity onPress={() => handleDeleteReview(review.id)} style={{ marginLeft: 'auto' }}>
                  <Text style={{ color: COLORS.danger, fontSize: 12 }}>Видалити</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.reviewText}>{review.text}</Text>
            <Text style={styles.reviewDate}>{review.created_at?.slice(0, 10)}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Кнопки внизу */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
          onPress={() =>
            navigation.getParent()?.navigate('Map', {
              screen: 'MapMain',
              params: { clinicId, lat: clinic.latitude, lng: clinic.longitude },
            })
          }
        >
          <Text style={styles.actionBtnText}>🗺 Маршрут</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: COLORS.accent }]}
          onPress={() => Linking.openURL(`tel:${clinic.phone}`)}
        >
          <Text style={styles.actionBtnText}>📞 Зателефонувати</Text>
        </TouchableOpacity>
      </View>

      {/* Модалка відгуку */}
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Залишити відгук</Text>
            <Text style={styles.filterLabel}>Оцінка</Text>
            <StarRating rating={reviewRating} onRate={setReviewRating} size={36} />
            <Text style={[styles.filterLabel, { marginTop: 12 }]}>Ваш відгук</Text>
            <TextInput
              style={styles.reviewInput}
              multiline
              numberOfLines={4}
              placeholder="Розкажіть про свій досвід..."
              placeholderTextColor={COLORS.textSecondary}
              value={reviewText}
              onChangeText={setReviewText}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.resetBtn} onPress={() => setShowReviewModal(false)}>
                <Text style={styles.resetBtnText}>Скасувати</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={submitReview}>
                <Text style={styles.applyBtnText}>Надіслати</Text>
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
  header: { flexDirection: 'row', padding: 16, alignItems: 'flex-start' },
  clinicName: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  district: { fontSize: 13, color: COLORS.primary, marginTop: 2 },
  favoriteBtn: { padding: 4 },
  badge24: { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  badge24Text: { color: COLORS.success, fontWeight: '700', fontSize: 13 },
  ratingBlock: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  ratingValue: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginLeft: 8 },
  reviewCount: { fontSize: 13, color: COLORS.textSecondary, marginLeft: 4 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12, marginHorizontal: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, paddingHorizontal: 16, marginBottom: 8 },
  contactRow: { fontSize: 14, color: COLORS.text, paddingHorizontal: 16, marginBottom: 6 },
  link: { color: COLORS.primary, textDecorationLine: 'underline' },
  description: { fontSize: 13, color: COLORS.textSecondary, paddingHorizontal: 16, marginTop: 6, lineHeight: 20 },
  whRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 4 },
  whDay: { fontSize: 14, color: COLORS.text },
  whTime: { fontSize: 14, color: COLORS.textSecondary },
  categoryBlock: { marginBottom: 12, paddingHorizontal: 16 },
  categoryLabel: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  serviceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  serviceName: { fontSize: 14, color: COLORS.text, flex: 1 },
  servicePrice: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  reviewsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  addReviewBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addReviewBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  noReviews: { paddingHorizontal: 16, color: COLORS.textSecondary, fontSize: 14 },
  reviewCard: { marginHorizontal: 16, marginBottom: 10, backgroundColor: COLORS.card, borderRadius: 10, padding: 12, elevation: 1 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  reviewAuthor: { fontWeight: '700', fontSize: 14, color: COLORS.text },
  reviewText: { fontSize: 13, color: COLORS.text, lineHeight: 20 },
  reviewDate: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  bottomBar: { flexDirection: 'row', padding: 12, gap: 10, backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border },
  actionBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  filterLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  reviewInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    padding: 12, fontSize: 14, color: COLORS.text,
    textAlignVertical: 'top', minHeight: 100,
  },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  resetBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  resetBtnText: { fontSize: 15, color: COLORS.text },
  applyBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  applyBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});
