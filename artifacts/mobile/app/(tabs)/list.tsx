import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useShopping } from '@/context/ShoppingContext';
import ShoppingListItemRow from '@/components/ShoppingListItemRow';
import EmptyState from '@/components/EmptyState';
import { Plus, X, PlusCircle, ShoppingCart } from 'lucide-react-native';
import { ShoppingItem } from '@/lib/storage';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export default function ListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { shoppingList, addShoppingItem, updateShoppingItem, removeShoppingItem, toggleShoppingItem, clearCheckedItems, syncAutoItems } =
    useShopping();

  const [addName, setAddName] = useState('');
  const [addQty, setAddQty] = useState('1');
  const [addUnit, setAddUnit] = useState('unit');
  const [addExpanded, setAddExpanded] = useState(false);

  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? insets.top + 67 : 0;
  const bottomPad = isWeb ? 34 : 0;

  const autoItems = shoppingList.filter((i) => i.isAuto && !i.checked);
  const manualItems = shoppingList.filter((i) => !i.isAuto && !i.checked);
  const checkedItems = shoppingList.filter((i) => i.checked);

  const handleAdd = () => {
    if (!addName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addShoppingItem({
      name: addName.trim(),
      quantity: parseFloat(addQty) || 1,
      unit: addUnit.trim() || 'unit',
      checked: false,
      isAuto: false,
    });
    setAddName('');
    setAddQty('1');
    setAddExpanded(false);
  };

  const handleSync = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    syncAutoItems();
  };

  type Section =
    | { type: 'header'; title: string; action?: { label: string; onPress: () => void } }
    | { type: 'item'; item: ShoppingItem }
    | { type: 'empty'; message: string };

  const sections: Section[] = [];

  if (autoItems.length > 0 || true) {
    sections.push({ type: 'header', title: 'Smart Suggestions', action: { label: 'Refresh', onPress: handleSync } });
    if (autoItems.length === 0) {
      sections.push({ type: 'empty', message: 'No smart suggestions right now' });
    } else {
      autoItems.forEach((item) => sections.push({ type: 'item', item }));
    }
  }

  sections.push({
    type: 'header',
    title: 'My List',
    action: checkedItems.length > 0 ? { label: 'Clear checked', onPress: clearCheckedItems } : undefined,
  });
  if (manualItems.length === 0 && checkedItems.length === 0) {
    sections.push({ type: 'empty', message: 'Your list is empty — add items below' });
  } else {
    manualItems.forEach((item) => sections.push({ type: 'item', item }));
    checkedItems.forEach((item) => sections.push({ type: 'item', item }));
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <FlatList
        data={sections}
        keyExtractor={(s, i) =>
          s.type === 'item' ? s.item.id : s.type === 'header' ? `h-${s.title}` : `e-${i}`
        }
        renderItem={({ item: s }) => {
          if (s.type === 'header') {
            return (
              <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{s.title}</Text>
                {s.action && (
                  <Pressable onPress={s.action.onPress} hitSlop={8}>
                    <Text style={[styles.sectionAction, { color: colors.primary }]}>{s.action.label}</Text>
                  </Pressable>
                )}
              </View>
            );
          }
          if (s.type === 'empty') {
            return (
              <Text style={[styles.emptyMsg, { color: colors.mutedForeground }]}>{s.message}</Text>
            );
          }
          return (
            <ShoppingListItemRow
              item={s.item}
              onToggle={() => toggleShoppingItem(s.item.id)}
              onDelete={() => removeShoppingItem(s.item.id)}
              onUpdateQuantity={(qty) => updateShoppingItem(s.item.id, { quantity: qty })}
            />
          );
        }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 180 + bottomPad }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          shoppingList.length === 0 ? (
            <View style={{ paddingTop: 20 }}>
              <EmptyState
                icon={ShoppingCart}
                title="Your shopping list is empty"
                subtitle="Smart suggestions appear here automatically when products are running low."
              />
            </View>
          ) : null
        }
      />

      {/* Add item card */}
      <View
        style={[
          styles.addCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius,
            bottom: insets.bottom + 80 + bottomPad,
            shadowColor: '#000',
          },
        ]}
      >
        {addExpanded ? (
          <View style={styles.addExpanded}>
            <TextInput
              style={[styles.addInput, { color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius - 4, backgroundColor: colors.muted }]}
              placeholder="Product name"
              placeholderTextColor={colors.mutedForeground}
              value={addName}
              onChangeText={setAddName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <View style={styles.addRow}>
              <TextInput
                style={[styles.addQtyInput, { color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius - 4, backgroundColor: colors.muted }]}
                placeholder="Qty"
                placeholderTextColor={colors.mutedForeground}
                value={addQty}
                onChangeText={setAddQty}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.addUnitInput, { color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius - 4, backgroundColor: colors.muted }]}
                placeholder="unit"
                placeholderTextColor={colors.mutedForeground}
                value={addUnit}
                onChangeText={setAddUnit}
              />
              <TouchableOpacity
                onPress={handleAdd}
                style={[styles.addConfirm, { backgroundColor: colors.primary, borderRadius: colors.radius - 4, opacity: addName.trim() ? 1 : 0.5 }]}
                disabled={!addName.trim()}
              >
                <Plus size={20} color={colors.primaryForeground} />
              </TouchableOpacity>
              <Pressable onPress={() => setAddExpanded(false)} hitSlop={8}>
                <X size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setAddExpanded(true)}
            style={styles.addCollapsed}
          >
            <PlusCircle size={20} color={colors.primary} />
            <Text style={[styles.addPlaceholder, { color: colors.mutedForeground }]}>Add item to list...</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: 'Inter_700Bold',
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  emptyMsg: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  addCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderWidth: 1,
    padding: 12,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  addCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  addPlaceholder: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  addExpanded: { gap: 10 },
  addInput: {
    height: 42,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addQtyInput: {
    height: 40,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 15,
    width: 64,
    fontFamily: 'Inter_400Regular',
  },
  addUnitInput: {
    height: 40,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 15,
    flex: 1,
    fontFamily: 'Inter_400Regular',
  },
  addConfirm: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
