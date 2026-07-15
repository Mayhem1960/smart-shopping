import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Product } from '@/lib/storage';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Props {
  visible: boolean;
  product: Product | null;
  onConsume: (productId: string, qty: number) => void;
  onRestock: (productId: string, qty: number) => void;
  onCancel: () => void;
}

export default function ConsumeModal({ visible, product, onConsume, onRestock, onCancel }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [qty, setQty] = useState('1');
  const [mode, setMode] = useState<'consume' | 'restock'>('consume');

  const parsed = parseFloat(qty) || 0;

  const handleConsume = () => {
    if (!product || parsed <= 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConsume(product.id, parsed);
  };

  const handleRestock = () => {
    if (!product || parsed <= 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onRestock(product.id, parsed);
  };

  const adjust = (delta: number) => {
    const current = parseFloat(qty) || 0;
    const next = Math.max(0, current + delta);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQty(String(next % 1 === 0 ? next : next.toFixed(1)));
  };

  if (!product) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onCancel} hitSlop={8}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>{product.name}</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.body}>
          {/* Stock display */}
          <View style={[styles.stockBox, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
            <Text style={[styles.stockLabel, { color: colors.mutedForeground }]}>Current stock</Text>
            <Text style={[styles.stockValue, { color: colors.foreground }]}>
              {product.currentQuantity} <Text style={{ fontSize: 18, fontWeight: '400' }}>{product.unit}</Text>
            </Text>
          </View>

          {/* Mode toggle */}
          <View style={[styles.modeRow, { backgroundColor: colors.muted, borderRadius: 30 }]}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'consume' && { backgroundColor: colors.card, borderRadius: 26 }]}
              onPress={() => setMode('consume')}
            >
              <Text style={[styles.modeTxt, { color: mode === 'consume' ? colors.foreground : colors.mutedForeground }]}>
                Log Use
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'restock' && { backgroundColor: colors.card, borderRadius: 26 }]}
              onPress={() => setMode('restock')}
            >
              <Text style={[styles.modeTxt, { color: mode === 'restock' ? colors.foreground : colors.mutedForeground }]}>
                Restock
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quantity control */}
          <View style={styles.qtyRow}>
            <Pressable
              onPress={() => adjust(-1)}
              style={[styles.qtyBtn, { backgroundColor: colors.muted, borderRadius: 24 }]}
            >
              <Feather name="minus" size={22} color={colors.foreground} />
            </Pressable>
            <TextInput
              style={[styles.qtyInput, { color: colors.foreground }]}
              value={qty}
              onChangeText={setQty}
              keyboardType="decimal-pad"
              textAlign="center"
            />
            <Pressable
              onPress={() => adjust(1)}
              style={[styles.qtyBtn, { backgroundColor: colors.muted, borderRadius: 24 }]}
            >
              <Feather name="plus" size={22} color={colors.foreground} />
            </Pressable>
          </View>

          <Text style={[styles.unit, { color: colors.mutedForeground }]}>{product.unit}</Text>

          {/* Quick amounts */}
          <View style={styles.quickRow}>
            {[0.5, 1, 2, 5].map((v) => (
              <TouchableOpacity
                key={v}
                onPress={() => setQty(String(v))}
                style={[styles.quickChip, { backgroundColor: colors.secondary, borderRadius: 20 }]}
              >
                <Text style={[styles.quickTxt, { color: colors.secondaryForeground }]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Action button */}
          <TouchableOpacity
            onPress={mode === 'consume' ? handleConsume : handleRestock}
            style={[
              styles.actionBtn,
              {
                backgroundColor: mode === 'consume' ? colors.primary : colors.ok,
                borderRadius: colors.radius,
                opacity: parsed <= 0 ? 0.5 : 1,
              },
            ]}
            disabled={parsed <= 0}
          >
            <Feather
              name={mode === 'consume' ? 'trending-down' : 'trending-up'}
              size={20}
              color="#fff"
            />
            <Text style={styles.actionTxt}>
              {mode === 'consume' ? `Used ${qty} ${product.unit}` : `Added ${qty} ${product.unit}`}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    maxWidth: 220,
    textAlign: 'center',
  },
  body: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    gap: 20,
  },
  stockBox: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 4,
  },
  stockLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stockValue: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  modeRow: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modeTxt: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  qtyBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInput: {
    fontSize: 48,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    minWidth: 100,
    textAlign: 'center',
  },
  unit: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginTop: -12,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  quickTxt: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
    width: '100%',
    marginTop: 8,
  },
  actionTxt: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});
