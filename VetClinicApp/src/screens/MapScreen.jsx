import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Linking, Platform, Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import { getAllClinics } from '../db/clinicService';
import { COLORS } from '../constants';
import { LEAFLET_JS, LEAFLET_CSS } from '../assets/leafletSource';

// ── Haversine ────────────────────────────────────────────────────────────────
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Генерація HTML ───────────────────────────────────────────────────────────
function buildMapHtml(clinics) {
  const clinicsJson = JSON.stringify(
    clinics.map(c => ({
      id: c.id,
      name: c.name,
      address: c.address,
      district: c.district,
      latitude: c.latitude,
      longitude: c.longitude,
      rating: c.rating,
      review_count: c.review_count,
      is_24_7: c.is_24_7,
    }))
  );

  // Захист від передчасного закриття тегів HTML-парсером
  const safeJs  = LEAFLET_JS.replace(/<\/script>/gi,  '<\\/script>');
  const safeCss = LEAFLET_CSS.replace(/<\/style>/gi, '<\\/style>');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
  <style>${safeCss}</style>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    html,body{height:100%;overflow:hidden;background:#e8e0d8;}
    #map{height:100vh;width:100vw;}
    .leaflet-control-attribution{font-size:9px!important;}
  </style>
</head>
<body>
<div id="map"></div>
<script>${safeJs}<\/script>
<script>
(function(){
  var CLINICS = ${clinicsJson};
  var markers = [];
  var userMarker = null;

  function postMsg(obj) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(obj)); } catch(e){}
  }

  var map = L.map('map',{zoomControl:true}).setView([49.8397,24.0297],13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'\\u00a9 OpenStreetMap contributors',
    maxZoom:19
  }).addTo(map);

  function renderMarkers(data){
    markers.forEach(function(m){map.removeLayer(m);});
    markers=[];
    data.forEach(function(c){
      var color=c.is_24_7?'#40916C':'#2D6A4F';
      var m=L.circleMarker([c.latitude,c.longitude],{
        radius:11,color:'#ffffff',weight:2,fillColor:color,fillOpacity:0.9
      });
      m.on('click',function(){postMsg({type:'select',id:c.id});});
      m.addTo(map);
      markers.push(m);
    });
  }

  function setUserMarker(lat,lng){
    if(userMarker)map.removeLayer(userMarker);
    userMarker=L.circleMarker([lat,lng],{
      radius:9,color:'#ffffff',weight:3,fillColor:'#1a73e8',fillOpacity:1
    }).addTo(map);
  }

  function handleMessage(data){
    try{
      var msg=JSON.parse(data);
      if(msg.type==='updateClinics') renderMarkers(msg.clinics);
      if(msg.type==='setUser')       setUserMarker(msg.lat,msg.lng);
      if(msg.type==='flyTo')         map.setView([msg.lat,msg.lng],msg.zoom||15);
    }catch(e){}
  }

  document.addEventListener('message',function(e){handleMessage(e.data);});
  window.addEventListener('message',  function(e){handleMessage(e.data);});

  renderMarkers(CLINICS);
  postMsg({type:'ready'});
})();
<\/script>
</body>
</html>`;
}

const MAP_FILE = FileSystem.cacheDirectory + 'vetclinic_map.html';

// ── Компонент ────────────────────────────────────────────────────────────────
export default function MapScreen({ route, navigation }) {
  const [clinics, setClinics] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [htmlUri, setHtmlUri] = useState(null);       // file:// URI для WebView
  const [webLoading, setWebLoading] = useState(true);
  const [nearestOnly, setNearestOnly] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState(null);

  const webViewRef  = useRef(null);
  const timerRef    = useRef(null);

  const targetClinicId = route?.params?.clinicId ?? null;
  const targetLat      = route?.params?.lat ?? null;
  const targetLng      = route?.params?.lng ?? null;

  // ── Завантаження клінік та геолокації ──
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLocation(loc.coords);
        } catch {}
      }
      const data = await getAllClinics();
      setClinics(data);
      setLoading(false);
    })();
  }, []);

  // ── Запис HTML у файл після завантаження клінік ──
  useEffect(() => {
    if (loading) return;
    const html = buildMapHtml(clinics);
    FileSystem.writeAsStringAsync(MAP_FILE, html)
      .then(() => setHtmlUri(MAP_FILE))
      .catch(() => {
        // fallback: передаємо HTML напряму
        setHtmlUri('inline');
      });
  }, [loading]);

  // ── Надсилання повідомлення у WebView ──
  function injectMsg(obj) {
    const js = `handleMessage(${JSON.stringify(JSON.stringify(obj))}); true;`;
    webViewRef.current?.injectJavaScript(js);
  }

  // ── Карта готова ──
  function onMapReady() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setWebLoading(false);

    if (userLocation) {
      injectMsg({ type: 'setUser', lat: userLocation.latitude, lng: userLocation.longitude });
    }
    if (targetLat && targetLng) {
      setTimeout(() => {
        injectMsg({ type: 'flyTo', lat: targetLat, lng: targetLng, zoom: 16 });
        if (targetClinicId) {
          const c = clinics.find(x => x.id === targetClinicId);
          if (c) setSelectedClinic(c);
        }
      }, 400);
    }
  }

  // ── Fallback: ховаємо спінер через 6 сек навіть без ready ──
  function startFallbackTimer() {
    timerRef.current = setTimeout(() => setWebLoading(false), 6000);
  }

  // ── Повідомлення з WebView ──
  function onWebViewMessage(event) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') onMapReady();
      if (msg.type === 'select') {
        const clinic = clinics.find(c => c.id === msg.id);
        if (clinic) setSelectedClinic(clinic);
      }
    } catch {}
  }

  // ── "Найближчі 5" ──
  function toggleNearest() {
    if (!userLocation) {
      Alert.alert(
        'Геолокація недоступна',
        'На цьому пристрої не вдалося отримати координати. Спробуйте на реальному телефоні або увімкніть геолокацію в налаштуваннях емулятора.',
        [{ text: 'Зрозуміло' }]
      );
      return;
    }
    const next = !nearestOnly;
    setNearestOnly(next);
    setSelectedClinic(null);

    const list = next
      ? [...clinics]
          .map(c => ({
            ...c,
            distance: haversineDistance(
              userLocation.latitude, userLocation.longitude,
              c.latitude, c.longitude,
            ),
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 5)
      : clinics;

    injectMsg({ type: 'updateClinics', clinics: list });
    if (next) injectMsg({ type: 'flyTo', lat: userLocation.latitude, lng: userLocation.longitude, zoom: 14 });
  }

  // ── Маршрут ──
  function openRoute(clinic) {
    const { latitude, longitude } = clinic;
    const label = encodeURIComponent(clinic.name);
    const url = Platform.OS === 'ios'
      ? `maps:0,0?q=${label}@${latitude},${longitude}`
      : `geo:0,0?q=${latitude},${longitude}(${label})`;
    Linking.canOpenURL(url).then(ok =>
      Linking.openURL(ok ? url : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`)
    );
  }

  // ── Рендер ──
  if (loading || !htmlUri) {
    return (
      <View style={styles.loaderFull}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loaderText}>Завантаження…</Text>
      </View>
    );
  }

  const webSource = htmlUri === 'inline'
    ? { html: buildMapHtml(clinics) }
    : { uri: 'file://' + MAP_FILE };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        style={styles.map}
        originWhitelist={['*', 'file://*']}
        source={webSource}
        onMessage={onWebViewMessage}
        onLoad={startFallbackTimer}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowUniversalAccessFromFileURLs
        allowFileAccessFromFileURLs
        mixedContentMode="always"
      />

      {/* Спінер поки Leaflet ініціалізується */}
      {webLoading && (
        <View style={styles.mapLoader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loaderText}>Ініціалізація карти…</Text>
        </View>
      )}

      {!webLoading && (
        <>
          {/* Кнопка "Найближчі 5" */}
          <TouchableOpacity
            style={[styles.nearbyBtn, nearestOnly && styles.nearbyBtnActive]}
            onPress={toggleNearest}
            activeOpacity={0.85}
          >
            <Text style={[styles.nearbyBtnText, nearestOnly && styles.nearbyBtnTextActive]}>
              📍 {nearestOnly ? '← Всі клініки' : '5 найближчих'}
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
        </>
      )}

      {/* Картка клініки */}
      {selectedClinic && (
        <View style={styles.clinicCard}>
          <TouchableOpacity style={styles.cardClose} onPress={() => setSelectedClinic(null)}>
            <Text style={styles.cardCloseText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.cardName} numberOfLines={2}>{selectedClinic.name}</Text>
          <Text style={styles.cardAddr} numberOfLines={1}>{selectedClinic.address}</Text>

          <View style={styles.cardMeta}>
            <Text style={styles.cardRating}>★ {selectedClinic.rating.toFixed(1)}</Text>
            <Text style={styles.cardReviews}>{selectedClinic.review_count} відгуків</Text>
            {selectedClinic.is_24_7 && (
              <View style={styles.badge24}>
                <Text style={styles.badge24Text}>24/7</Text>
              </View>
            )}
          </View>

          <View style={styles.cardButtons}>
            <TouchableOpacity style={styles.cardBtnRoute} onPress={() => openRoute(selectedClinic)}>
              <Text style={styles.cardBtnRouteText}>🗺 Маршрут</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cardBtnDetail}
              onPress={() => {
                setSelectedClinic(null);
                navigation.navigate('ClinicProfile', { clinicId: selectedClinic.id });
              }}
            >
              <Text style={styles.cardBtnDetailText}>Детальніше →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Стилі ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  loaderFull: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loaderText: { marginTop: 10, color: COLORS.textSecondary, fontSize: 14 },

  mapLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#f0ede8', zIndex: 10,
  },

  nearbyBtn: {
    position: 'absolute', top: 12, alignSelf: 'center',
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 9,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 5,
  },
  nearbyBtnActive: { backgroundColor: COLORS.primary },
  nearbyBtnText: { fontWeight: '700', color: COLORS.text, fontSize: 13 },
  nearbyBtnTextActive: { color: '#fff' },

  legend: {
    position: 'absolute', bottom: 20, left: 12,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 10,
    padding: 8, gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 3,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
  legendText: { fontSize: 12, color: COLORS.text, fontWeight: '500' },

  clinicCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 10,
  },
  cardClose: {
    position: 'absolute', top: 14, right: 16,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center',
  },
  cardCloseText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700' },
  cardName: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginRight: 36, marginBottom: 4 },
  cardAddr: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardRating: { fontSize: 14, color: COLORS.star, fontWeight: '700' },
  cardReviews: { fontSize: 13, color: COLORS.textSecondary },
  badge24: { backgroundColor: COLORS.success, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badge24Text: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardButtons: { flexDirection: 'row', gap: 10 },
  cardBtnRoute: {
    flex: 1, borderWidth: 1.5, borderColor: COLORS.primary,
    borderRadius: 10, paddingVertical: 11, alignItems: 'center',
  },
  cardBtnRouteText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  cardBtnDetail: {
    flex: 1, backgroundColor: COLORS.primary,
    borderRadius: 10, paddingVertical: 11, alignItems: 'center',
  },
  cardBtnDetailText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
