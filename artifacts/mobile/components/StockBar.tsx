import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { stockFraction, StockStatus } from '@/lib/predictions';
import { Product } from '@/lib/storage';

interface Props {
  product: Product;
  status: StockStatus;
  height?: number;
}

export default function StockBar({ product, status, height = 6 }: Props) {
  const colors = useColors();
  const fraction = stockFraction(product);

  const barColor =
    status === 'ok'
      ? colors.ok
      : status === 'low'
        ? colors.warning
        : status === 'critical'
          ? colors.critical
          : colors.out;

  return (
    <View style={[styles.track, { height, backgroundColor: colors.muted, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${Math.max(4, fraction * 100)}%`,
            backgroundColor: barColor,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
