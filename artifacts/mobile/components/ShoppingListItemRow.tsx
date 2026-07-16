import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { ShoppingItem } from '@/lib/storage';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Props {
  item: ShoppingItem;
  onToggle: () => void;
  onDelete: () => void;
}

export default function ShoppingListItemRow({ item, onToggle, onDelete }: Props) {
  const colors = useColors();

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

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
          {item.checked && <Feather name="check" size={12} color={colors.primaryForeground} />}
        </View>
      </Pressable>

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
        <Text style={[styles.qty, { color: colors.mutedForeground }]}>
          {item.quantity} {item.unit}
          {item.isAuto && (
            <Text style={{ color: colors.primary }}> · Auto</Text>
          )}
        </Text>
      </Pressable>

      <Pressable onPress={onDelete} hitSlop={8} style={styles.deleteBtn}>
        <Feather name="trash-2" size={16} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginVertical: 4,
    gap: 12,
  },
  checkBtn: {
    padding: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  qty: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  deleteBtn: {
    padding: 4,
  },
});
