import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Linking, Platform, Alert,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { getAllClinics } from '../db/clinicService';
import { COLORS } from '../constants';

const LVIV_REGION = {
  latitude: 49.8397,
  longitude: 24.0297,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapScreen({ route, navigation }) {
  const [clinics, setClinics] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nearestOnly, setNearestOnly] = useState(false);
  const mapRef = useRef(null);

  const targetClinicId = route?.params?.clinicId ?? null;
  const targetLat = route?.params?.lat ?? null;
  const targetLng = route?.params?.lng ?? null;

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation(loc.coords);
      }
      const data = await getAllClinics();
      setClinics(data);
      setLoading(false);

      if (targetLat && targetLng && mapRef.current) {
        setTimeout(() => {
          mapRef.current?.animateToRegion({
            latitude: targetLat,
            longitude: targetLng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 800);
        }, 500);
      }
    })();
  }, []);

  function openRoute(clinic) {
    const { latitude, longitude } = clinic;
    const label = encodeURIComponent(clinic.name);
    const url = Platform.OS === 'ios'
      ? `maps:0,0?q=${label}@${latitude},${longitude}`
      : `geo:0,0?q=${latitude},${longitude}(${label})`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`);
      }
    });
  }

  const displayedClinics = nearestOnly && userLocation
    ? [...clinics]
        .map(c => ({ ...c, distance: haversineDistance(userLocation.latitude, userLocation.longitude, c.latitude, c.longitude) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5)
    : clinics;

  if (loading) return <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}

        initialRegion={LVIV_REGION}
        showsUserLocation
        showsMyLocationButton
      >
        {displayedClinics.map(clinic => (
          <Marker
            key={clinic.id}
            coordinate={{ latitude: clinic.latitude, longitude: clinic.longitude }}
            pinColor={clinic.id === targetClinicId ? COLORS.danger : (clinic.is_24_7 ? COLORS.success : COLORS.primary)}
          >
            <Callout onPress={() => navigation.navigate('ClinicProfile', { clinicId: clinic.id })}>
              <View style={styles.callout}>
                <Text style={styles.calloutName}>{clinic.name}</Text>
                <Text style={styles.calloutAddr}>{clinic.address}</Text>
                <View style={styles.calloutRow}>
                  <Text style={styles.calloutRating}>★ {clinic.rating.toFixed(1)}</Text>
                  {clinic.is_24_7 && <Text style={styles.callout24}>24/7</Text>}
                </View>
                <TouchableOpacity style={styles.routeBtn} onPress={() => openRoute(clinic)}>
                  <Text style={styles.routeBtnText}>🗺 Маршрут</Text>
                </TouchableOpacity>
                <Text style={styles.detailsLink}>Детальніше →</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Кнопка "Найближчі" */}
      <TouchableOpacity
        style={[styles.nearbyBtn, nearestOnly && styles.nearbyBtnActive]}
        onPress={() => {
          if (!userLocation) {
            Alert.alert('Геолокація', 'Дозвольте доступ до геолокації для цієї функції');
            return;
          }
          setNearestOnly(!nearestOnly);
        }}
      >
        <Text style={[styles.nearbyBtnText, nearestOnly && { color: '#fff' }]}>
          📍 {nearestOnly ? '5 найближчих' : 'Всі клініки'}
        </Text>
      </TouchableOpacity>

      {/* Легенда */}
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
          <Text style={styles.legendText}>24/7</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.legendText}>Звичайна</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  callout: { width: 200, padding: 4 },
  calloutName: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  calloutAddr: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  calloutRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  calloutRating: { fontSize: 13, color: COLORS.star, fontWeight: '600' },
  callout24: { backgroundColor: COLORS.success, color: '#fff', fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  routeBtn: { backgroundColor: COLORS.primary, borderRadius: 6, paddingVertical: 6, alignItems: 'center', marginBottom: 4 },
  routeBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  detailsLink: { textAlign: 'center', color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  nearbyBtn: {
    position: 'absolute', top: 12, alignSelf: 'center',
    backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  nearbyBtnActive: { backgroundColor: COLORS.primary },
  nearbyBtnText: { fontWeight: '600', color: COLORS.text },
  legend: {
    position: 'absolute', bottom: 20, left: 12,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10,
    padding: 8, gap: 4,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: COLORS.text },
});
