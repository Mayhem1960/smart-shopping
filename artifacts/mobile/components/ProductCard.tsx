import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { getStockStatus, getDaysUntilEmpty, formatDaysLeft } from '@/lib/predictions';
import { Product } from '@/lib/storage';
import StockBar from './StockBar';
import { Package } from 'lucide-react-native';

interface Props {
  product: Product;
  onPress: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  ok: 'In stock',
  low: 'Running low',
  critical: 'Critical',
  out: 'Out of stock',
};

export default function ProductCard({ product, onPress }: Props) {
  const colors = useColors();
  const status = getStockStatus(product);
  const days = getDaysUntilEmpty(product);

  const statusColor =
    status === 'ok'
      ? colors.ok
      : status === 'low'
        ? colors.warning
        : status === 'critical'
          ? colors.critical
          : colors.out;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
          {product.imageUri ? (
            <Image
              source={{ uri: product.imageUri }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <Package size={20} color={colors.mutedForeground} />
          )}
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {product.name}
          </Text>
          {product.brand ? (
            <Text style={[styles.brand, { color: colors.mutedForeground }]} numberOfLines={1}>
              {product.brand}
            </Text>
          ) : null}
        </View>
        <View style={styles.right}>
          <Text style={[styles.qty, { color: colors.foreground }]}>
            {product.currentQuantity}
            <Text style={[styles.unit, { color: colors.mutedForeground }]}> {product.unit}</Text>
          </Text>
          <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{STATUS_LABELS[status]}</Text>
          </View>
        </View>
      </View>

      <View style={styles.barRow}>
        <StockBar product={product} status={status} />
        {days !== null && (
          <Text style={[styles.days, { color: colors.mutedForeground }]}>
            {formatDaysLeft(days)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 5,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  brand: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  qty: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  unit: {
    fontSize: 12,
    fontWeight: '400',
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  barRow: {
    gap: 4,
  },
  days: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'right',
  },
});
