import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, FlatList, Modal,
} from 'react-native';
import { logout, updateProfile, activateSubscription } from '../db/authService';
import { readFavorites } from '../services/fileService';
import { getUserEmergencyCalls } from '../services/emergencyService';
import { COLORS } from '../constants';

const STATUS_LABELS = {
  created: '⏳ Створено',
  accepted: '✅ Прийнято',
  in_progress: '🚗 В дорозі',
  completed: '✓ Виконано',
  cancelled: '✕ Скасовано',
};

export default function ProfileScreen({ user, setUser, navigation, route }) {
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [favorites, setFavorites] = useState([]);
  const [emergencyCalls, setEmergencyCalls] = useState([]);
  const [showEmergency, setShowEmergency] = useState(false);

  useEffect(() => {
    if (user) {
      loadFavorites();
      loadEmergencyCalls();
    }
  }, [user]);

  async function loadFavorites() {
    const favs = await readFavorites();
    setFavorites(favs);
  }

  async function loadEmergencyCalls() {
    const calls = await getUserEmergencyCalls(user.id);
    setEmergencyCalls(calls);
  }

  async function handleSaveName() {
    if (!newName.trim()) return;
    await updateProfile(user.id, newName.trim());
    setUser({ ...user, name: newName.trim() });
    setEditingName(false);
  }

  async function handleActivateSub() {
    Alert.alert(
      'Преміум підписка',
      'Активувати безкоштовно для демонстрації?',
      [
        { text: 'Скасувати' },
        {
          text: 'Активувати',
          onPress: async () => {
            const updated = await activateSubscription(user.id);
            if (updated) setUser(updated);
          },
        },
      ]
    );
  }

  async function handleLogout() {
    await logout();
    setUser(null);
  }

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.guestIcon}>🐾</Text>
        <Text style={styles.guestTitle}>Ви не авторизовані</Text>
        <Text style={styles.guestText}>Увійдіть, щоб залишати відгуки та користуватися преміум-функціями</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Auth')}>
          <Text style={styles.loginBtnText}>Увійти / Зареєструватися</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Шапка профілю */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name?.charAt(0)?.toUpperCase() || '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          {editingName ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.editInput}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
              <TouchableOpacity onPress={handleSaveName} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>✓</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingName(true)}>
              <Text style={styles.userName}>{user.name} ✏️</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.userEmail}>{user.email}</Text>
          <Text style={styles.userRole}>
            {user.role === 'admin' ? '👑 Адміністратор' : user.role === 'clinic_rep' ? '🏥 Представник клініки' : '👤 Користувач'}
          </Text>
        </View>
      </View>

      {/* Підписка */}
      <View style={styles.subscriptionCard}>
        {user.subscription_active ? (
          <>
            <Text style={styles.subActive}>⭐ Преміум активний</Text>
            <Text style={styles.subDesc}>Доступний екстрений виклик та всі функції</Text>
          </>
        ) : (
          <>
            <Text style={styles.subInactive}>🔒 Базовий акаунт</Text>
            <Text style={styles.subDesc}>Активуйте преміум для екстреного виклику</Text>
            <TouchableOpacity style={styles.activateBtn} onPress={handleActivateSub}>
              <Text style={styles.activateBtnText}>Активувати Преміум</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Файли та улюблені */}
      <TouchableOpacity
        style={styles.filesBtn}
        onPress={() => navigation.navigate('Favorites')}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.filesBtnTitle}>📁 Файли та улюблені</Text>
          <Text style={styles.filesBtnSub}>
            {favorites.length > 0
              ? `${favorites.length} збережених клінік · favorites.json`
              : 'Переглянути файли та зберегти клініки'}
          </Text>
        </View>
        <Text style={styles.filesArrow}>›</Text>
      </TouchableOpacity>

      {/* Екстрений виклик */}
      {user.subscription_active && (
        <>
          <TouchableOpacity
            style={styles.emergencyBtn}
            onPress={() => navigation.navigate('Emergency')}
          >
            <Text style={styles.emergencyBtnText}>🚨 Екстрений виклик</Text>
          </TouchableOpacity>

          {emergencyCalls.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>📋 Мої заявки</Text>
              {emergencyCalls.slice(0, 3).map(call => (
                <View key={call.id} style={styles.callItem}>
                  <Text style={styles.callStatus}>{STATUS_LABELS[call.status] || call.status}</Text>
                  <Text style={styles.callDesc}>{call.pet_type} — {call.description}</Text>
                  <Text style={styles.callDate}>{call.created_at?.slice(0, 16)}</Text>
                </View>
              ))}
            </>
          )}
        </>
      )}

      {/* Адмін-панель */}
      {user.role === 'admin' && (
        <TouchableOpacity style={styles.adminBtn} onPress={() => navigation.navigate('Admin')}>
          <Text style={styles.adminBtnText}>👑 Адмін-панель</Text>
        </TouchableOpacity>
      )}

      {/* Вихід */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Вийти з акаунту</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  guestIcon: { fontSize: 60, marginBottom: 12 },
  guestTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  guestText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  loginBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  profileHeader: { flexDirection: 'row', padding: 16, alignItems: 'center', gap: 14 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '700' },
  userName: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  userEmail: { fontSize: 13, color: COLORS.textSecondary },
  userRole: { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editInput: { flex: 1, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8, padding: 6, fontSize: 16, color: COLORS.text },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  subscriptionCard: { marginHorizontal: 16, backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 16, elevation: 2 },
  subActive: { fontSize: 16, fontWeight: '700', color: COLORS.success },
  subInactive: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
  subDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  activateBtn: { backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  activateBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, paddingHorizontal: 16, marginBottom: 8, marginTop: 8 },
  emptyText: { paddingHorizontal: 16, color: COLORS.textSecondary, fontSize: 14, marginBottom: 8 },
  favItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: COLORS.card, borderRadius: 10, padding: 12, elevation: 1 },
  favName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  favAddr: { fontSize: 12, color: COLORS.textSecondary },
  filesBtn: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: COLORS.card,
    borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center',
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  filesBtnTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  filesBtnSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  filesArrow: { fontSize: 22, color: COLORS.textSecondary },
  emergencyBtn: { marginHorizontal: 16, backgroundColor: COLORS.danger, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  emergencyBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  callItem: { marginHorizontal: 16, marginBottom: 8, backgroundColor: COLORS.card, borderRadius: 10, padding: 12, elevation: 1 },
  callStatus: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  callDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  callDate: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  adminBtn: { marginHorizontal: 16, marginTop: 12, backgroundColor: COLORS.primaryDark, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  adminBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  logoutBtn: { marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderColor: COLORS.danger, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  logoutBtnText: { color: COLORS.danger, fontSize: 15, fontWeight: '700' },
});
