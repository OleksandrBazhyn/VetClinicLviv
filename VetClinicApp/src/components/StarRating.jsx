import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

export default function StarRating({ rating, onRate, size = 28, readonly = false }) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity
          key={star}
          onPress={() => !readonly && onRate && onRate(star)}
          disabled={readonly}
          activeOpacity={0.7}
        >
          <Text style={[styles.star, { fontSize: size, color: star <= rating ? COLORS.star : COLORS.border }]}>
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  star: { marginHorizontal: 2 },
});
