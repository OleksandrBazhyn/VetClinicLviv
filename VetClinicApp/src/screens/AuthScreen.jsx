import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { register, login } from '../db/authService';
import { COLORS } from '../constants';

export default function AuthScreen({ navigation, onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Помилка', 'Заповніть всі поля');
      return;
    }
    if (!isLogin && !name.trim()) {
      Alert.alert('Помилка', "Введіть ім'я");
      return;
    }
    setLoading(true);
    try {
      const user = isLogin
        ? await login(email.trim(), password)
        : await register(name.trim(), email.trim(), password);
      onLogin?.(user);
    } catch (e) {
      Alert.alert('Помилка', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.logo}>🐾</Text>
        <Text style={styles.title}>Ветеринарні клініки</Text>
        <Text style={styles.subtitle}>Львів</Text>

        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, isLogin && styles.tabActive]} onPress={() => setIsLogin(true)}>
            <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>Вхід</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, !isLogin && styles.tabActive]} onPress={() => setIsLogin(false)}>
            <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>Реєстрація</Text>
          </TouchableOpacity>
        </View>

        {!isLogin && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ім'я</Text>
            <TextInput style={styles.input} placeholder="Ваше ім'я" value={name} onChangeText={setName} placeholderTextColor={COLORS.textSecondary} />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="email@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Пароль</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>{isLogin ? 'Увійти' : 'Зареєструватися'}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={() => navigation?.goBack()}>
          <Text style={styles.skipBtnText}>Продовжити без авторизації</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { fontSize: 64, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 16, color: COLORS.primary, marginBottom: 28 },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.border, borderRadius: 10, padding: 3, marginBottom: 20, width: '100%' },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  inputGroup: { width: '100%', marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    padding: 13, fontSize: 15, color: COLORS.text,
    backgroundColor: COLORS.card,
  },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, width: '100%', alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipBtn: { marginTop: 16 },
  skipBtnText: { color: COLORS.textSecondary, fontSize: 14, textDecorationLine: 'underline' },
});
