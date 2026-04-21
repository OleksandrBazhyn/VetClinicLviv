import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { adminAddClinic, adminUpdateClinic } from '../db/clinicService';
import { COLORS, DISTRICTS } from '../constants';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

function toBoolean(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function buildWorkingHours(existingHours = []) {
  return DAYS.map((day) => {
    const match = existingHours.find((item) => item.day === day);
    return { day, time: match?.time ?? '' };
  });
}

export default function AdminClinicFormScreen({ route, navigation }) {
  const existing = route.params?.clinic ?? null;
  const isEdit = !!existing;

  const initialWorkingHours = useMemo(
    () => buildWorkingHours(existing?.workingHours ?? []),
    [existing]
  );

  const [name, setName] = useState(existing?.name ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [district, setDistrict] = useState(existing?.district ?? '');
  const [latitude, setLatitude] = useState(existing?.latitude != null ? String(existing.latitude) : '');
  const [longitude, setLongitude] = useState(existing?.longitude != null ? String(existing.longitude) : '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [website, setWebsite] = useState(existing?.website ?? '');
  const [is24_7, setIs24_7] = useState(toBoolean(existing?.is_24_7));
  const [description, setDescription] = useState(existing?.description ?? '');
  const [workingHours, setWorkingHours] = useState(initialWorkingHours);
  const [saving, setSaving] = useState(false);
  const [showDistricts, setShowDistricts] = useState(false);

  function updateHour(index, time) {
    setWorkingHours((prev) => prev.map((item, i) => (i === index ? { ...item, time } : item)));
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Помилка', 'Назва є обовʼязковою');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Помилка', 'Адреса є обовʼязковою');
      return;
    }
    if (!district) {
      Alert.alert('Помилка', 'Оберіть район');
      return;
    }

    const lat = Number(latitude.replace(',', '.'));
    const lng = Number(longitude.replace(',', '.'));
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      Alert.alert('Помилка', 'Введіть коректні координати');
      return;
    }

    const filledHours = workingHours
      .map((item) => ({ ...item, time: item.time.trim() }))
      .filter((item) => item.time.length > 0);

    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        address: address.trim(),
        district,
        latitude: lat,
        longitude: lng,
        phone: phone.trim(),
        website: website.trim(),
        is_24_7: is24_7,
        description: description.trim(),
        workingHours: filledHours,
      };

      if (isEdit) {
        await adminUpdateClinic(existing.id, data);
        Alert.alert('Готово', 'Клініку оновлено', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        await adminAddClinic(data);
        Alert.alert('Готово', 'Клініку додано', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (error) {
      Alert.alert('Помилка', error.message);
    } finally {
      setSaving(false);
    }
  }

  const districtOptions = DISTRICTS.filter((item) => item !== 'Всі райони');

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.sectionTitle}>Основна інформація</Text>

      <Text style={styles.label}>Назва *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Наприклад: Ветклініка Здоров'я"
        placeholderTextColor={COLORS.textSecondary}
      />

      <Text style={styles.label}>Адреса *</Text>
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={setAddress}
        placeholder="вул. Шевченка, 1"
        placeholderTextColor={COLORS.textSecondary}
      />

      <Text style={styles.label}>Район *</Text>
      <TouchableOpacity style={[styles.input, styles.picker]} onPress={() => setShowDistricts((prev) => !prev)}>
        <Text style={{ color: district ? COLORS.text : COLORS.textSecondary }}>
          {district || 'Оберіть район'}
        </Text>
        <Text style={styles.pickerArrow}>{showDistricts ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {showDistricts && (
        <View style={styles.dropdownList}>
          {districtOptions.map((item) => (
            <TouchableOpacity
              key={item}
              style={styles.dropdownItem}
              onPress={() => {
                setDistrict(item);
                setShowDistricts(false);
              }}
            >
              <Text style={[styles.dropdownText, district === item && styles.dropdownTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Широта *</Text>
          <TextInput
            style={styles.input}
            value={latitude}
            onChangeText={setLatitude}
            placeholder="49.8383"
            keyboardType="numeric"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Довгота *</Text>
          <TextInput
            style={styles.input}
            value={longitude}
            onChangeText={setLongitude}
            placeholder="24.0232"
            keyboardType="numeric"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>
      </View>

      <Text style={styles.label}>Телефон</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="+38 032 123 45 67"
        keyboardType="phone-pad"
        placeholderTextColor={COLORS.textSecondary}
      />

      <Text style={styles.label}>Сайт</Text>
      <TextInput
        style={styles.input}
        value={website}
        onChangeText={setWebsite}
        placeholder="https://clinic.lviv.ua"
        keyboardType="url"
        placeholderTextColor={COLORS.textSecondary}
      />

      <View style={styles.switchRow}>
        <Text style={styles.label}>Цілодобово (24/7)</Text>
        <Switch
          value={Boolean(is24_7)}
          onValueChange={(value) => setIs24_7(Boolean(value))}
          trackColor={{ true: COLORS.primary }}
          thumbColor={is24_7 ? COLORS.primaryLight : '#ccc'}
        />
      </View>

      <Text style={styles.label}>Опис</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Короткий опис клініки..."
        placeholderTextColor={COLORS.textSecondary}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.sectionTitle}>Години роботи</Text>
      <Text style={styles.hint}>Залиште поле порожнім, якщо клініка не працює у цей день</Text>
      {workingHours.map((item, index) => (
        <View key={item.day} style={styles.hourRow}>
          <Text style={styles.dayLabel}>{item.day}</Text>
          <TextInput
            style={[styles.input, styles.hourInput]}
            value={item.time}
            onChangeText={(text) => updateHour(index, text)}
            placeholder="09:00-20:00"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>
      ))}

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{isEdit ? 'Зберегти зміни' : 'Додати клініку'}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginTop: 8, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
  hint: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 10 },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 12,
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerArrow: { color: COLORS.textSecondary, fontSize: 12 },
  dropdownList: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dropdownText: { fontSize: 15, color: COLORS.text },
  dropdownTextActive: { color: COLORS.primary, fontWeight: '700' },
  row: { flexDirection: 'row' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  hourRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  dayLabel: { width: 26, fontSize: 14, fontWeight: '600', color: COLORS.text },
  hourInput: { flex: 1, marginBottom: 0, paddingVertical: 10 },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
