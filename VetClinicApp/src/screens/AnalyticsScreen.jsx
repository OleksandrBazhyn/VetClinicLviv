import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { getClinicsStats } from '../db/clinicService';
import { COLORS } from '../constants';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 32;

// Назви категорій послуг українською
const CAT_LABELS = {
  surgery: 'Хірургія',
  therapy: 'Терапія',
  dental: 'Стоматол.',
  grooming: 'Грумінг',
  diagnostics: 'Діагност.',
  vaccination: 'Вакцинація',
  orthopedics: 'Ортопедія',
  other: 'Інше',
};

const blueChartConfig = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(72, 133, 237, ${opacity})`,
  labelColor: () => COLORS.textSecondary,
  barPercentage: 0.65,
  propsForLabels: { fontSize: 11 },
};

// ─── Власний компонент горизонтальної гістограми ──────────────────────────────
function HorizontalBarChart({ data, color = COLORS.primary }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <View>
      {data.map((item, index) => (
        <View key={index} style={hStyles.row}>
          <Text style={hStyles.label} numberOfLines={1}>{item.label}</Text>
          <View style={hStyles.trackWrapper}>
            <View style={hStyles.track}>
              <View
                style={[
                  hStyles.bar,
                  {
                    width: `${Math.max(4, Math.round((item.value / maxVal) * 100))}%`,
                    backgroundColor: color,
                  },
                ]}
              />
            </View>
          </View>
          <Text style={hStyles.valueText}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const hStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  label: {
    width: 110,
    fontSize: 13,
    color: COLORS.text,
    marginRight: 8,
  },
  trackWrapper: {
    flex: 1,
    marginRight: 8,
  },
  track: {
    height: 22,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 6,
  },
  valueText: {
    width: 24,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'right',
  },
});
// ──────────────────────────────────────────────────────────────────────────────

function InsightBox({ text }) {
  return (
    <View style={styles.insightBox}>
      <Text style={styles.insightIcon}>💡</Text>
      <Text style={styles.insightText}>{text}</Text>
    </View>
  );
}

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

  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1 }} />;
  }

  const { byDistrict, availability, ratingGroups, byServiceCategory, topRated, aggregates } = stats;

  // --- Графік 2: Кругова — 24/7 vs звичайні ---
  const count24_7 = availability.find(r => r.is_24_7 === true || r.is_24_7 === 1)?.count || 0;
  const countNormal = availability.find(r => r.is_24_7 === false || r.is_24_7 === 0)?.count || 0;
  const total = count24_7 + countNormal;
  const pieData = [
    {
      name: `Цілодобово (${count24_7})`,
      population: count24_7,
      color: COLORS.success,
      legendFontColor: COLORS.text,
      legendFontSize: 12,
    },
    {
      name: `Звичайні (${countNormal})`,
      population: countNormal,
      color: COLORS.primaryLight,
      legendFontColor: COLORS.text,
      legendFontSize: 12,
    },
  ];
  const pct24 = total > 0 ? Math.round((count24_7 / total) * 100) : 0;

  // --- Графік 3: Розподіл рейтингів ---
  const ratingOrder = ['4.5–5', '4.0–4.5', '3.5–4.0', 'до 3.5'];
  const sortedRating = ratingOrder.map(label => {
    const found = ratingGroups.find(r => r.group_label === label);
    return { label, value: found ? found.count : 0 };
  });
  const bestRatingGroup = sortedRating.find(r => r.value > 0);

  // --- Графік 4: Послуги за категоріями ---
  const topCategories = byServiceCategory.slice(0, 6);
  const barServiceData = {
    labels: topCategories.map(r => CAT_LABELS[r.category] || r.category),
    datasets: [{ data: topCategories.map(r => r.count) }],
  };
  const topService = topCategories[0];

  const topDistrict = byDistrict[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 36 }}>
      <Text style={styles.pageTitle}>📊 Аналітика клінік</Text>

      {/* Рядок статистики */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{aggregates?.totalClinics ?? total}</Text>
          <Text style={styles.statLabel}>Клінік</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{count24_7}</Text>
          <Text style={styles.statLabel}>Цілодобових</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{aggregates?.avgRating ?? '—'}</Text>
          <Text style={styles.statLabel}>Сер. рейтинг</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{aggregates?.totalReviews ?? 0}</Text>
          <Text style={styles.statLabel}>Відгуків</Text>
        </View>
      </View>

      {/* ── Графік 1: Горизонтальна — клініки за районами ── */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>🏘️ Клініки за районами</Text>
        <Text style={styles.chartSubtitle}>Кількість ветклінік у кожному районі Львова</Text>
        <HorizontalBarChart
          data={byDistrict.map(r => ({ label: r.district, value: r.count }))}
          color={COLORS.primary}
        />
        {topDistrict && (
          <InsightBox
            text={`Найбільше клінік у ${topDistrict.district} районі — ${topDistrict.count}.`}
          />
        )}
      </View>

      {/* ── Графік 2: Кругова — режим роботи ── */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>🕐 Режим роботи</Text>
        <Text style={styles.chartSubtitle}>Частка цілодобових та звичайних клінік</Text>
        <PieChart
          data={pieData}
          width={CHART_WIDTH - 16}
          height={180}
          chartConfig={{
            color: (opacity = 1) => `rgba(45, 106, 79, ${opacity})`,
            labelColor: () => COLORS.textSecondary,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="16"
          style={styles.chart}
          hasLegend
        />
        <InsightBox
          text={`${pct24}% клінік Львова працюють цілодобово — це ${count24_7} з ${total}.`}
        />
      </View>

      {/* ── Графік 3: Горизонтальна — розподіл за рейтингом ── */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>⭐ Розподіл за рейтингом</Text>
        <Text style={styles.chartSubtitle}>Кількість клінік у кожній рейтинговій групі</Text>
        <HorizontalBarChart
          data={sortedRating}
          color="#f4a261"
        />
        {bestRatingGroup && (
          <InsightBox
            text={`Найбільше клінік (${bestRatingGroup.value}) мають рейтинг ${bestRatingGroup.label} — найвища категорія якості.`}
          />
        )}
      </View>

      {/* ── Графік 4: Вертикальна — послуги за категоріями ── */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>🩺 Послуги за категоріями</Text>
        <Text style={styles.chartSubtitle}>Кількість пропозицій кожної категорії по всіх клініках</Text>
        <BarChart
          data={barServiceData}
          width={CHART_WIDTH - 16}
          height={210}
          chartConfig={blueChartConfig}
          style={styles.chart}
          showValuesOnTopOfBars
          fromZero
          yAxisLabel=""
          yAxisSuffix=""
        />
        {topService && (
          <InsightBox
            text={`Найпоширеніша послуга — «${CAT_LABELS[topService.category] || topService.category}» (${topService.count} позицій у клініках).`}
          />
        )}
      </View>

      {/* ── Топ-5 клінік ── */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>🏆 Топ-5 клінік за рейтингом</Text>
        <Text style={styles.chartSubtitle}>Найкращі клініки Львова за оцінками відвідувачів</Text>
        {topRated.map((clinic, index) => (
          <View key={clinic.id} style={[styles.topClinicRow, index === topRated.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={[styles.rankBadge, index === 0 && styles.rankBadgeGold]}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <View style={styles.topClinicInfo}>
              <Text style={styles.topClinicName} numberOfLines={1}>{clinic.name}</Text>
              <Text style={styles.topClinicMeta}>{clinic.district} · {clinic.review_count} відгуків</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingBadgeText}>⭐ {clinic.rating.toFixed(1)}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  pageTitle: {
    fontSize: 22, fontWeight: '800', color: COLORS.text, padding: 16, paddingBottom: 8,
  },

  statsRow: {
    flexDirection: 'row', marginHorizontal: 16, gap: 6, marginBottom: 8,
  },
  statBox: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 10,
    alignItems: 'center', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  statNum: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },

  chartCard: {
    backgroundColor: COLORS.card, borderRadius: 14, margin: 16, marginBottom: 8,
    padding: 16, paddingBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  chartTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  chartSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 10 },
  chart: { borderRadius: 8, marginLeft: -8 },

  insightBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#f0faf4', borderRadius: 10, padding: 10, marginTop: 10,
  },
  insightIcon: { fontSize: 14, marginRight: 6, marginTop: 1 },
  insightText: { flex: 1, fontSize: 12, color: COLORS.text, lineHeight: 18 },

  topClinicRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rankBadge: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  rankBadgeGold: { backgroundColor: '#f4a261' },
  rankText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  topClinicInfo: { flex: 1 },
  topClinicName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  topClinicMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  ratingBadge: {
    backgroundColor: '#fff9e6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#ffe08a',
  },
  ratingBadgeText: { fontSize: 13, fontWeight: '700', color: '#b45309' },
});
