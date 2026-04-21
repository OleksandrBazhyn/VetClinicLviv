import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { createEmergencyCall } from '../services/emergencyService';
import { COLORS } from '../constants';

const PET_TYPES = ['Собака', 'Кішка', 'Птах', 'Гризун', 'Рептилія', 'Інше'];

export default function EmergencyScreen({ user, navigation }) {
  const [petType, setPetType] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [geoLoading, setGeoLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [callId, setCallId] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
      }
      setGeoLoading(false);
    })();
  }, []);

  async function handleSubmit() {
    if (!petType) { Alert.alert('Помилка', 'Оберіть тип тварини'); return; }
    if (!description.trim()) { Alert.alert('Помилка', 'Опишіть ситуацію'); return; }
    if (!location) { Alert.alert('Помилка', 'Не вдалося визначити геолокацію'); return; }

    Alert.alert(
      '🚨 Підтвердіть виклик',
      'Надіслати заявку на екстрену ветеринарну допомогу?',
      [
        { text: 'Скасувати' },
        {
          text: 'Надіслати',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              const id = await createEmergencyCall(
                user.id, location.latitude, location.longitude, petType, description.trim()
              );
              setCallId(id);
              setSubmitted(true);
            } catch (e) {
              Alert.alert('Помилка', e.message);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  }

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Заявку відправлено!</Text>
        <Text style={styles.successText}>Заявка №{callId}</Text>
        <Text style={styles.successText}>Статус: ⏳ Очікування</Text>
        <Text style={styles.successHint}>Адміністратор отримав ваш запит та зв'яжеться найближчим часом</Text>
        <View style={styles.coordBox}>
          <Text style={styles.coordText}>📍 Координати передані:</Text>
          <Text style={styles.coordValue}>{location?.latitude.toFixed(6)}, {location?.longitude.toFixed(6)}</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>На головну</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.warningBanner}>
        <Text style={styles.warningText}>🚨 Екстрений виклик ветеринара</Text>
        <Text style={styles.warningSubtext}>Використовуйте лише у справді невідкладних ситуаціях</Text>
      </View>

      {/* Геолокація */}
      <View style={styles.geoBox}>
        {geoLoading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : location ? (
          <>
            <Text style={styles.geoOk}>✅ Геолокацію визначено</Text>
            <Text style={styles.geoCoords}>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</Text>
          </>
        ) : (
          <Text style={styles.geoError}>❌ Геолокація недоступна</Text>
        )}
      </View>

      {/* Тип тварини */}
      <Text style={styles.label}>Тип тварини</Text>
      <View style={styles.petTypesGrid}>
        {PET_TYPES.map(pt => (
          <TouchableOpacity
            key={pt}
            style={[styles.petTypeChip, petType === pt && styles.petTypeChipActive]}
            onPress={() => setPetType(pt)}
          >
            <Text style={[styles.petTypeText, petType === pt && styles.petTypeTextActive]}>{pt}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Опис */}
      <Text style={styles.label}>Опис ситуації</Text>
      <TextInput
        style={styles.textArea}
        multiline
        numberOfLines={4}
        placeholder="Опишіть симптоми, стан тварини, що сталося..."
        placeholderTextColor={COLORS.textSecondary}
        value={description}
        onChangeText={setDescription}
      />

      <TouchableOpacity
        style={[styles.submitBtn, (!location || submitting) && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={!location || submitting}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>🚨 Надіслати виклик</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  warningBanner: { backgroundColor: '#FFF3CD', borderRadius: 12, padding: 14, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: COLORS.warning },
  warningText: { fontSize: 16, fontWeight: '700', color: '#856404' },
  warningSubtext: { fontSize: 13, color: '#856404', marginTop: 4 },
  geoBox: { backgroundColor: COLORS.card, borderRadius: 10, padding: 12, marginBottom: 16, alignItems: 'center' },
  geoOk: { fontSize: 14, fontWeight: '600', color: COLORS.success },
  geoCoords: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  geoError: { fontSize: 14, color: COLORS.danger },
  label: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  petTypesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  petTypeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  petTypeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  petTypeText: { fontSize: 14, color: COLORS.text },
  petTypeTextActive: { color: '#fff', fontWeight: '600' },
  textArea: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.text, textAlignVertical: 'top', minHeight: 120, backgroundColor: COLORS.card, marginBottom: 20 },
  submitBtn: { backgroundColor: COLORS.danger, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  // Success
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: COLORS.background },
  successIcon: { fontSize: 64, marginBottom: 12 },
  successTitle: { fontSize: 24, fontWeight: '800', color: COLORS.success, marginBottom: 8 },
  successText: { fontSize: 16, color: COLORS.text, marginBottom: 4 },
  successHint: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  coordBox: { backgroundColor: COLORS.card, borderRadius: 10, padding: 12, marginTop: 16, alignItems: 'center', width: '100%' },
  coordText: { fontSize: 13, color: COLORS.textSecondary },
  coordValue: { fontSize: 12, color: COLORS.text, fontWeight: '600', marginTop: 2 },
  backBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, marginTop: 24 },
  backBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
