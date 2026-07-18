import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { ShoppingItem } from '@/lib/storage';
import { Check, Trash2, Minus, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface Props {
  item: ShoppingItem;
  onToggle: () => void;
  onDelete: () => void;
  onUpdateQuantity?: (newQty: number) => void;
}

export default function ShoppingListItemRow({ item, onToggle, onDelete, onUpdateQuantity }: Props) {
  const colors = useColors();
  const [editing, setEditing] = useState(false);
  const [qtyText, setQtyText] = useState(String(item.quantity));

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  const step = (delta: number) => {
    const next = Math.max(0.5, (item.quantity) + delta);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdateQuantity?.(next);
  };

  const commitEdit = () => {
    const parsed = parseFloat(qtyText);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdateQuantity?.(parsed);
    } else {
      setQtyText(String(item.quantity));
    }
    setEditing(false);
  };

  // Keep local text in sync when item.quantity changes externally
  React.useEffect(() => {
    if (!editing) setQtyText(String(item.quantity));
  }, [item.quantity, editing]);

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius - 2,
          opacity: item.checked ? 0.6 : 1,
        },
      ]}
    >
      {/* Checkbox */}
      <Pressable onPress={handleToggle} style={styles.checkBtn} hitSlop={8}>
        <View
          style={[
            styles.checkbox,
            {
              borderColor: item.checked ? colors.primary : colors.border,
              backgroundColor: item.checked ? colors.primary : 'transparent',
            },
          ]}
        >
          {item.checked && <Check size={12} color={colors.primaryForeground} />}
        </View>
      </Pressable>

      {/* Name */}
      <Pressable onPress={handleToggle} style={styles.label}>
        <Text
          style={[
            styles.name,
            {
              color: colors.foreground,
              textDecorationLine: item.checked ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {item.isAuto && (
          <Text style={[styles.autoTag, { color: colors.primary }]}>Auto</Text>
        )}
      </Pressable>

      {/* Quantity stepper */}
      {onUpdateQuantity && !item.checked ? (
        <View style={styles.stepper}>
          <Pressable onPress={() => step(-1)} hitSlop={6} style={[styles.stepBtn, { backgroundColor: colors.muted, borderRadius: 8 }]}>
            <Minus size={12} color={colors.foreground} />
          </Pressable>

          {editing ? (
            <TextInput
              style={[styles.qtyInput, { color: colors.foreground, borderColor: colors.border, borderRadius: 6, backgroundColor: colors.muted }]}
              value={qtyText}
              onChangeText={setQtyText}
              onBlur={commitEdit}
              onSubmitEditing={commitEdit}
              keyboardType="decimal-pad"
              autoFocus
              selectTextOnFocus
            />
          ) : (
            <Pressable onPress={() => { setQtyText(String(item.quantity)); setEditing(true); }}>
              <Text style={[styles.qtyTxt, { color: colors.foreground }]}>
                {item.quantity} {item.unit}
              </Text>
            </Pressable>
          )}

          <Pressable onPress={() => step(1)} hitSlop={6} style={[styles.stepBtn, { backgroundColor: colors.muted, borderRadius: 8 }]}>
            <Plus size={12} color={colors.foreground} />
          </Pressable>
        </View>
      ) : (
        <Text style={[styles.qtyStatic, { color: colors.mutedForeground }]}>
          {item.quantity} {item.unit}
        </Text>
      )}

      {/* Delete */}
      <Pressable onPress={onDelete} hitSlop={8} style={styles.deleteBtn}>
        <Trash2 size={16} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginVertical: 4,
    gap: 10,
  },
  checkBtn: { padding: 2 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  autoTag: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBtn: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  qtyTxt: { fontSize: 13, fontFamily: 'Inter_500Medium', minWidth: 40, textAlign: 'center' },
  qtyInput: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    width: 52,
    height: 28,
    borderWidth: 1,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  qtyStatic: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  deleteBtn: { padding: 4 },
});
