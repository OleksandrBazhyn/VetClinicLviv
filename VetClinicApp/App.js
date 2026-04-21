import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { initDatabase } from './src/db/database';
import { getCurrentUser } from './src/db/authService';

import ClinicsListScreen from './src/screens/ClinicsListScreen';
import ClinicProfileScreen from './src/screens/ClinicProfileScreen';
import MapScreen from './src/screens/MapScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AuthScreen from './src/screens/AuthScreen';
import EmergencyScreen from './src/screens/EmergencyScreen';
import AdminScreen from './src/screens/AdminScreen';
import AdminClinicFormScreen from './src/screens/AdminClinicFormScreen';

import { COLORS } from './src/constants';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HEADER_OPTIONS = {
  headerStyle: { backgroundColor: COLORS.primary },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' },
};

function ClinicsStack({ user, setUser }) {
  return (
    <Stack.Navigator screenOptions={HEADER_OPTIONS}>
      <Stack.Screen name="ClinicsList" component={ClinicsListScreen} options={{ title: 'Ветклініки Львова' }} />
      <Stack.Screen name="ClinicProfile" component={ClinicProfileScreen} options={{ title: 'Профіль клініки' }} />
      <Stack.Screen name="Auth" options={{ title: 'Вхід / Реєстрація' }}>
        {(props) => <AuthScreen {...props} onLogin={setUser} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function MapStack() {
  return (
    <Stack.Navigator screenOptions={HEADER_OPTIONS}>
      <Stack.Screen name="MapMain" component={MapScreen} options={{ title: 'Карта клінік' }} />
      <Stack.Screen name="ClinicProfile" component={ClinicProfileScreen} options={{ title: 'Профіль клініки' }} />
    </Stack.Navigator>
  );
}

function ProfileStack({ user, setUser }) {
  return (
    <Stack.Navigator screenOptions={HEADER_OPTIONS}>
      <Stack.Screen name="ProfileMain" options={{ title: 'Профіль' }}>
        {(props) => <ProfileScreen {...props} user={user} setUser={setUser} />}
      </Stack.Screen>
      <Stack.Screen name="Auth" options={{ title: 'Вхід / Реєстрація' }}>
        {(props) => <AuthScreen {...props} onLogin={setUser} />}
      </Stack.Screen>
      <Stack.Screen name="Emergency" options={{ title: '🚨 Екстрений виклик' }}>
        {(props) => <EmergencyScreen {...props} user={user} />}
      </Stack.Screen>
      <Stack.Screen name="Admin" component={AdminScreen} options={{ title: '👑 Адмін-панель' }} />
      <Stack.Screen
        name="AdminClinicForm"
        component={AdminClinicFormScreen}
        options={({ route }) => ({ title: route.params?.clinic ? 'Редагувати клініку' : 'Нова клініка' })}
      />
    </Stack.Navigator>
  );
}

const TAB_ICONS = {
  Clinics: '🏥',
  Map: '🗺️',
  Analytics: '📊',
  Profile: '👤',
};

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      await initDatabase();
      const u = await getCurrentUser();
      setUser(u);
      setDbReady(true);
    })();
  }, []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <StatusBar style="dark" />
        <Text style={{ fontSize: 52, marginBottom: 16 }}>🐾</Text>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12, color: COLORS.textSecondary, fontSize: 14 }}>
          Завантаження...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor={COLORS.primaryDark} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textSecondary,
          tabBarStyle: { borderTopColor: COLORS.border, backgroundColor: COLORS.card, height: 56 },
          tabBarLabelStyle: { fontSize: 11, marginBottom: 4 },
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: focused ? 22 : 19 }}>{TAB_ICONS[route.name]}</Text>
          ),
        })}
      >
        <Tab.Screen name="Clinics" options={{ title: 'Клініки' }}>
          {() => <ClinicsStack user={user} setUser={setUser} />}
        </Tab.Screen>

        <Tab.Screen name="Map" component={MapStack} options={{ title: 'Карта' }} />

        <Tab.Screen
          name="Analytics"
          component={AnalyticsScreen}
          options={{
            title: 'Аналітика',
            headerShown: true,
            ...HEADER_OPTIONS,
            headerTitle: 'Аналітика',
          }}
        />

        <Tab.Screen name="Profile" options={{ title: 'Профіль' }}>
          {() => <ProfileStack user={user} setUser={setUser} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
