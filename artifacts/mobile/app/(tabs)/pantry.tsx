import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useShopping } from '@/context/ShoppingContext';
import ProductCard from '@/components/ProductCard';
import EmptyState from '@/components/EmptyState';
import AddProductModal, { ProductFormData } from '@/components/AddProductModal';
import { Search, X, Plus, Package, ArrowUpDown } from 'lucide-react-native';
import { getStockStatus } from '@/lib/predictions';
import { Platform } from 'react-native';

type FilterType = 'all' | 'low' | 'ok';
type SortType = 'status' | 'name' | 'category';

export default function PantryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { products, addProduct } = useShopping();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('status');
  const [addModalVisible, setAddModalVisible] = useState(false);

  const SORT_CYCLE: SortType[] = ['status', 'name', 'category'];
  const SORT_LABELS: Record<SortType, string> = {
    status: 'By Status',
    name: 'By Name',
    category: 'By Category',
  };

  const cycleSort = () => {
    const idx = SORT_CYCLE.indexOf(sort);
    setSort(SORT_CYCLE[(idx + 1) % SORT_CYCLE.length]);
  };

  const filtered = products
    .filter((p) => {
      const q = search.toLowerCase();
      if (q && !p.name.toLowerCase().includes(q) && !p.brand?.toLowerCase().includes(q) && !p.category?.toLowerCase().includes(q)) return false;
      if (filter === 'low') {
        const s = getStockStatus(p);
        return s === 'low' || s === 'critical' || s === 'out';
      }
      if (filter === 'ok') return getStockStatus(p) === 'ok';
      return true;
    })
    .sort((a, b) => {
      if (sort === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sort === 'category') {
        const ca = (a.category ?? '').toLowerCase();
        const cb = (b.category ?? '').toLowerCase();
        if (ca !== cb) return ca.localeCompare(cb);
        return a.name.localeCompare(b.name);
      }
      // Default: by stock status urgency
      const order: Record<string, number> = { out: 0, critical: 1, low: 2, ok: 3 };
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

  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? insets.top + 67 : 0;
  const bottomPad = isWeb ? 34 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Search bar */}
      <View style={[styles.searchRow, { backgroundColor: colors.muted, borderRadius: colors.radius, margin: 16, marginBottom: 10 }]}>
        <Search size={16} color={colors.mutedForeground} />
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
            <X size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {/* Filter chips + sort toggle */}
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
        <Pressable
          onPress={cycleSort}
          style={[styles.sortBtn, { backgroundColor: colors.muted, borderRadius: 16 }]}
          hitSlop={4}
        >
          <ArrowUpDown size={13} color={colors.primary} />
          <Text style={[styles.sortTxt, { color: colors.primary }]}>{SORT_LABELS[sort]}</Text>
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={Package}
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
        <Plus size={26} color={colors.primaryForeground} />
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
    paddingVertical: 6,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    // No tight fixed height: height 22 clipped the typed text on Android.
    height: 40,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  sortTxt: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
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
