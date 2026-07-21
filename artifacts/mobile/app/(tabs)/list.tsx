import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useShopping } from '@/context/ShoppingContext';
import { usePromotions } from '@/context/PromotionsContext';
import ShoppingListItemRow from '@/components/ShoppingListItemRow';
import EmptyState from '@/components/EmptyState';
import { Plus, X, PlusCircle, ShoppingCart, MapPin, Tag, RefreshCw, XCircle } from 'lucide-react-native';
import { ShoppingItem } from '@/lib/storage';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export default function ListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { shoppingList, addShoppingItem, updateShoppingItem, removeShoppingItem, toggleShoppingItem, clearCheckedItems, syncAutoItems } =
    useShopping();
  const { settings, isLoading: promoLoading, enablePromotions, disablePromotions, refreshDeals, getDeal } = usePromotions();

  const [addName, setAddName] = useState('');
  const [addQty, setAddQty] = useState('1');
  const [addUnit, setAddUnit] = useState('unit');
  const [addExpanded, setAddExpanded] = useState(false);
  const [showConsent, setShowConsent] = useState(false);

  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? insets.top + 67 : 0;
  const bottomPad = isWeb ? 34 : 0;

  const autoItems = shoppingList.filter((i) => i.isAuto && !i.checked);
  const manualItems = shoppingList.filter((i) => !i.isAuto && !i.checked);
  const checkedItems = shoppingList.filter((i) => i.checked);

  // Annotate list items with deal info when promotions are enabled
  const annotatedList: ShoppingItem[] = settings.enabled
    ? shoppingList.map((item) => {
        if (item.checked) return item;
        const deal = getDeal(item.name);
        if (!deal) return item;
        return { ...item, storePromotion: deal.store, promoPrice: deal.price };
      })
    : shoppingList;

  const annotatedAuto = annotatedList.filter((i) => i.isAuto && !i.checked);
  const annotatedManual = annotatedList.filter((i) => !i.isAuto && !i.checked);
  const annotatedChecked = annotatedList.filter((i) => i.checked);

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

  const handleEnablePromotions = () => {
    setShowConsent(false);
    enablePromotions().then(() => {
      // Refresh deals for current list items after location is resolved
      const names = shoppingList.map((i) => i.name);
      if (names.length > 0) refreshDeals(names);
    });
  };

  const handleRefreshDeals = () => {
    const names = shoppingList.map((i) => i.name);
    if (names.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refreshDeals(names);
  };

  const handleDisablePromotions = () => {
    Alert.alert(
      'Disable Promotions',
      'Stop checking for local store deals?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disable', style: 'destructive', onPress: disablePromotions },
      ],
    );
  };

  type Section =
    | { type: 'header'; title: string; action?: { label: string; onPress: () => void } }
    | { type: 'item'; item: ShoppingItem }
    | { type: 'empty'; message: string }
    | { type: 'promo-banner' }
    | { type: 'promo-active' };

  const sections: Section[] = [];

  // Promotions banner (top)
  if (!settings.enabled) {
    sections.push({ type: 'promo-banner' });
  } else {
    sections.push({ type: 'promo-active' });
  }

  if (annotatedAuto.length > 0 || true) {
    sections.push({ type: 'header', title: 'Smart Suggestions', action: { label: 'Refresh', onPress: handleSync } });
    if (annotatedAuto.length === 0) {
      sections.push({ type: 'empty', message: 'No smart suggestions right now' });
    } else {
      annotatedAuto.forEach((item) => sections.push({ type: 'item', item }));
    }
  }

  sections.push({
    type: 'header',
    title: 'My List',
    action: checkedItems.length > 0 ? { label: 'Clear checked', onPress: clearCheckedItems } : undefined,
  });
  if (annotatedManual.length === 0 && annotatedChecked.length === 0) {
    sections.push({ type: 'empty', message: 'Your list is empty — add items below' });
  } else {
    annotatedManual.forEach((item) => sections.push({ type: 'item', item }));
    annotatedChecked.forEach((item) => sections.push({ type: 'item', item }));
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Promotions Consent Modal Overlay */}
      {showConsent && (
        <View style={styles.consentOverlay}>
          <View style={[styles.consentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.consentIconRow}>
              <View style={[styles.consentIconCircle, { backgroundColor: '#dcfce7' }]}>
                <Tag size={24} color="#16a34a" />
              </View>
            </View>
            <Text style={[styles.consentTitle, { color: colors.foreground }]}>Local Store Promotions</Text>
            <Text style={[styles.consentBody, { color: colors.mutedForeground }]}>
              Smart Shopping can check for promotions and deals at nearby supermarkets in your city and match them to your shopping list.{'\n\n'}
              This requires access to your <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>location</Text> to find your city. No data is shared with third parties.
            </Text>
            <TouchableOpacity
              onPress={handleEnablePromotions}
              style={[styles.consentBtn, { backgroundColor: '#16a34a', borderRadius: colors.radius - 2 }]}
            >
              <MapPin size={16} color="#fff" />
              <Text style={styles.consentBtnTxt}>Enable & Allow Location</Text>
            </TouchableOpacity>
            <Pressable onPress={() => setShowConsent(false)} style={styles.consentCancel}>
              <Text style={[styles.consentCancelTxt, { color: colors.mutedForeground }]}>Not now</Text>
            </Pressable>
          </View>
        </View>
      )}

      <FlatList
        data={sections}
        keyExtractor={(s, i) =>
          s.type === 'item' ? s.item.id : `${s.type}-${i}`
        }
        renderItem={({ item: s }) => {
          if (s.type === 'promo-banner') {
            return (
              <Pressable
                onPress={() => setShowConsent(true)}
                style={[styles.promoBanner, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}
              >
                <Tag size={16} color="#16a34a" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.promoBannerTitle}>Find local store deals</Text>
                  <Text style={styles.promoBannerSub}>Tap to enable promotions in your city</Text>
                </View>
                <Text style={styles.promoBannerAction}>Enable →</Text>
              </Pressable>
            );
          }

          if (s.type === 'promo-active') {
            const city = settings.locationInfo?.city;
            const dealsCount = settings.deals.length;
            return (
              <View style={[styles.promoActive, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                <Tag size={14} color="#16a34a" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.promoActiveTitle}>
                    {dealsCount > 0 ? `${dealsCount} deals found` : 'Promotions active'}
                    {city ? ` · ${city}` : ''}
                  </Text>
                  {settings.lastFetchedAt && (
                    <Text style={styles.promoActiveSub}>
                      Updated {new Date(settings.lastFetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>
                {promoLoading ? (
                  <ActivityIndicator size="small" color="#16a34a" />
                ) : (
                  <Pressable onPress={handleRefreshDeals} hitSlop={8}>
                    <RefreshCw size={16} color="#16a34a" />
                  </Pressable>
                )}
                <Pressable onPress={handleDisablePromotions} hitSlop={8} style={{ marginLeft: 8 }}>
                  <XCircle size={16} color="#6b7280" />
                </Pressable>
              </View>
            );
          }

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
  consentOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  consentCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    gap: 12,
    alignItems: 'center',
  },
  consentIconRow: { marginBottom: 4 },
  consentIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  consentBody: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  consentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 4,
    width: '100%',
    justifyContent: 'center',
  },
  consentBtnTxt: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  consentCancel: { paddingVertical: 8 },
  consentCancelTxt: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  promoBannerTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#16a34a',
  },
  promoBannerSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#4ade80',
  },
  promoBannerAction: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#16a34a',
  },
  promoActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  promoActiveTitle: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#16a34a',
  },
  promoActiveSub: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: '#86efac',
  },
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
