import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

export default function ClinicCard({ clinic, onPress }) {
  const stars = '★'.repeat(Math.round(clinic.rating)) + '☆'.repeat(5 - Math.round(clinic.rating));

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{clinic.name}</Text>
        {clinic.is_24_7 ? <View style={styles.badge24}><Text style={styles.badge24Text}>24/7</Text></View> : null}
      </View>

      <Text style={styles.address} numberOfLines={1}>📍 {clinic.address}</Text>
      <Text style={styles.district}>{clinic.district} район</Text>

      <View style={styles.footer}>
        <Text style={styles.stars}>{stars}</Text>
        <Text style={styles.rating}>{clinic.rating.toFixed(1)}</Text>
        <Text style={styles.reviewCount}>({clinic.review_count} відгуків)</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  badge24: {
    backgroundColor: COLORS.success,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badge24Text: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  address: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 2,
  },
  district: {
    color: COLORS.primary,
    fontSize: 12,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    color: COLORS.star,
    fontSize: 14,
    marginRight: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
