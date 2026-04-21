import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { getClinicsStats } from '../db/clinicService';
import { COLORS } from '../constants';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 32;

const chartConfig = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(45, 106, 79, ${opacity})`,
  labelColor: () => COLORS.textSecondary,
  propsForDots: { r: '5', strokeWidth: '2', stroke: COLORS.primaryDark },
};

export default function AnalyticsScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await getClinicsStats();
      setStats(data);
      setLoading(false);
    })();
  }, []);

  if (loading) return <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1 }} />;

  // Графік 1: Стовпчаста — клініки за районами
  const barData = {
    labels: stats.byDistrict.map(r => r.district.substring(0, 6)),
    datasets: [{ data: stats.byDistrict.map(r => r.count) }],
  };

  // Графік 2: Кругова — 24/7 vs звичайні
  const count24_7 = stats.availability.find(r => r.is_24_7 === 1)?.count || 0;
  const countNormal = stats.availability.find(r => r.is_24_7 === 0)?.count || 0;
  const pieData = [
    { name: 'Цілодобово', population: count24_7, color: COLORS.success, legendFontColor: COLORS.text, legendFontSize: 13 },
    { name: 'Звичайні', population: countNormal, color: COLORS.primaryLight, legendFontColor: COLORS.text, legendFontSize: 13 },
  ];

  // Графік 3: Лінійна
  const lineData = {
    labels: stats.ratingGroups.map(r => r.group_label),
    datasets: [{ data: stats.ratingGroups.map(r => r.count || 0) }],
  };

  const totalClinics = stats.byDistrict.reduce((s, r) => s + r.count, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      <Text style={styles.pageTitle}>📊 Аналітика клінік</Text>

      {/* Статистика у цифрах */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{totalClinics}</Text>
          <Text style={styles.statLabel}>Всього клінік</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{count24_7}</Text>
          <Text style={styles.statLabel}>Цілодобових</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.byDistrict.length}</Text>
          <Text style={styles.statLabel}>Районів</Text>
        </View>
      </View>

      {/* Графік 1: Стовпчаста */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Клініки за районами</Text>
        <Text style={styles.chartSubtitle}>Кількість клінік у кожному районі Львова</Text>
        <BarChart
          data={barData}
          width={CHART_WIDTH - 16}
          height={200}
          chartConfig={chartConfig}
          style={styles.chart}
          showValuesOnTopOfBars
          fromZero
        />
      </View>

      {/* Графік 2: Кругова */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Режим роботи клінік</Text>
        <Text style={styles.chartSubtitle}>Частка цілодобових та звичайних клінік</Text>
        <PieChart
          data={pieData}
          width={CHART_WIDTH - 16}
          height={180}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="16"
          style={styles.chart}
        />
      </View>

      {/* Графік 3: Лінійна */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Розподіл клінік за рейтингом</Text>
        <Text style={styles.chartSubtitle}>Кількість клінік у кожній групі рейтингу</Text>
        <LineChart
          data={lineData}
          width={CHART_WIDTH - 16}
          height={180}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => `rgba(244, 162, 97, ${opacity})`,
          }}
          style={styles.chart}
          bezier
          fromZero
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  pageTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, padding: 16, paddingBottom: 8 },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, gap: 8, marginBottom: 8 },
  statBox: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    alignItems: 'center', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  statNum: { fontSize: 28, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  chartCard: {
    backgroundColor: COLORS.card, borderRadius: 14, margin: 16, marginBottom: 8,
    padding: 16, paddingBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  chartTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  chartSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
  chart: { borderRadius: 8, marginLeft: -8 },
});
