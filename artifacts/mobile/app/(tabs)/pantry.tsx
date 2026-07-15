import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useShopping } from '@/context/ShoppingContext';
import ProductCard from '@/components/ProductCard';
import EmptyState from '@/components/EmptyState';
import AddProductModal, { ProductFormData } from '@/components/AddProductModal';
import { Feather } from '@expo/vector-icons';
import { getStockStatus } from '@/lib/predictions';

type FilterType = 'all' | 'low' | 'ok';

export default function PantryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { products, addProduct } = useShopping();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [addModalVisible, setAddModalVisible] = useState(false);

  const filtered = products
    .filter((p) => {
      const q = search.toLowerCase();
      if (q && !p.name.toLowerCase().includes(q) && !p.brand?.toLowerCase().includes(q)) return false;
      if (filter === 'low') {
        const s = getStockStatus(p);
        return s === 'low' || s === 'critical' || s === 'out';
      }
      if (filter === 'ok') return getStockStatus(p) === 'ok';
      return true;
    })
    .sort((a, b) => {
      const order = { out: 0, critical: 1, low: 2, ok: 3 };
      return order[getStockStatus(a)] - order[getStockStatus(b)];
    });

  const handleAddConfirm = (data: ProductFormData) => {
    addProduct(data);
    setAddModalVisible(false);
  };

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'low', label: 'Needs restock' },
    { key: 'ok', label: 'OK' },
  ];

  const isWeb = require('react-native').Platform.OS === 'web';
  const topPad = isWeb ? insets.top + 67 : 0;
  const bottomPad = isWeb ? 34 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Search bar */}
      <View style={[styles.searchRow, { backgroundColor: colors.muted, borderRadius: colors.radius, margin: 16 }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search products..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[
              styles.chip,
              {
                backgroundColor: filter === f.key ? colors.primary : colors.muted,
                borderRadius: 20,
              },
            ]}
          >
            <Text style={{ color: filter === f.key ? colors.primaryForeground : colors.foreground, fontSize: 13, fontWeight: '500', fontFamily: 'Inter_500Medium' }}>
              {f.label}
            </Text>
          </Pressable>
        ))}
        <View style={{ flex: 1 }} />
        <Text style={[styles.countTxt, { color: colors.mutedForeground }]}>{filtered.length} items</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="package"
            title={search ? 'No results found' : 'Your pantry is empty'}
            subtitle={search ? 'Try a different search term' : 'Scan a barcode or tap + to add your first product'}
          />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 + bottomPad }}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <Pressable
        onPress={() => setAddModalVisible(true)}
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            borderRadius: 28,
            bottom: insets.bottom + 90 + bottomPad,
          },
        ]}
      >
        <Feather name="plus" size={26} color={colors.primaryForeground} />
      </Pressable>

      <AddProductModal
        visible={addModalVisible}
        initialData={{ barcode: '', unit: 'unit', currentQuantity: 1, minThreshold: 1 }}
        onConfirm={handleAddConfirm}
        onCancel={() => setAddModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    height: 22,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  countTxt: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
