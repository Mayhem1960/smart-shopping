import React, { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useShopping } from '@/context/ShoppingContext';
import ProductCard from '@/components/ProductCard';
import EmptyState from '@/components/EmptyState';
import { getDaysUntilEmpty, getStockStatus, needsRestock } from '@/lib/predictions';
import { Camera, Package, AlertTriangle, ShoppingCart, ShoppingBag, ArrowLeftRight, Search, X, type LucideIcon } from 'lucide-react-native';
import { Platform } from 'react-native';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { products, shoppingList, syncAutoItems, isLoaded } = useShopping();

  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const searchResults = q
    ? products.filter((p) =>
        [p.name, p.brand, p.category].some((f) => f?.toLowerCase().includes(q)),
      )
    : [];

  useEffect(() => {
    if (isLoaded) syncAutoItems();
  }, [isLoaded]);

  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? insets.top + 67 : insets.top + 16;
  const bottomPad = isWeb ? 34 : 0;

  const needsRestockItems = products.filter((p) => needsRestock(p));
  const runningLow = products.filter((p) => {
    const d = getDaysUntilEmpty(p);
    return d !== null && d < 10 && d > 0 && getStockStatus(p) === 'ok';
  });
  const checkedCount = shoppingList.filter((i) => i.checked).length;
  const totalListCount = shoppingList.length;
  // Home "My List" shows only the user's own list items (not auto Smart Suggestions,
  // which are already surfaced under "Needs Restocking").
  const myListItems = shoppingList.filter((i) => !i.isAuto);

  const now = new Date();
  const hours = now.getHours();
  const greeting = hours < 12 ? 'Good morning' : hours < 18 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 + bottomPad, paddingTop: topPad }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{greeting}</Text>
            <Text style={[styles.date, { color: colors.foreground }]}>{dateStr}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/transfer')}
            hitSlop={10}
            style={[styles.transferBtn, { backgroundColor: colors.muted, borderRadius: 20 }]}
          >
            <ArrowLeftRight size={16} color={colors.primary} />
            <Text style={[styles.transferBtnTxt, { color: colors.primary }]}>Transfer</Text>
          </Pressable>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
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

      {q ? (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Search Results</Text>
            <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{searchResults.length}</Text>
          </View>
          {searchResults.length > 0 ? (
            searchResults.map((p) => (
              <ProductCard key={p.id} product={p} onPress={() => router.push(`/product/${p.id}`)} />
            ))
          ) : (
            <Text style={[styles.noResults, { color: colors.mutedForeground }]}>No products found for "{search.trim()}".</Text>
          )}
        </View>
      ) : (
        <>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard
          icon={Package}
          value={products.length}
          label="Products"
          color={colors.primary}
          bg={colors.secondary}
          onPress={() => router.push('/(tabs)/pantry')}
        />
        <StatCard
          icon={AlertTriangle}
          value={needsRestockItems.length}
          label="Need restock"
          color={colors.warning}
          bg={colors.warning + '20'}
          onPress={() => router.push('/(tabs)/pantry')}
        />
        <StatCard
          icon={ShoppingCart}
          value={totalListCount}
          label="On list"
          color={colors.ok}
          bg={colors.ok + '20'}
          onPress={() => router.push('/(tabs)/list')}
        />
      </View>

      {/* Needs Restocking */}
      {needsRestockItems.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionDot, { backgroundColor: colors.critical }]} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Needs Restocking</Text>
            <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{needsRestockItems.length}</Text>
          </View>
          {needsRestockItems.slice(0, 5).map((p) => (
            <ProductCard key={p.id} product={p} onPress={() => router.push(`/product/${p.id}`)} />
          ))}
          {needsRestockItems.length > 5 && (
            <Pressable onPress={() => router.push('/(tabs)/pantry')} style={styles.seeMore}>
              <Text style={[styles.seeMoreTxt, { color: colors.primary }]}>
                See all {needsRestockItems.length} items
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Running low */}
      {runningLow.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionDot, { backgroundColor: colors.warning }]} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Running Low Soon</Text>
            <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{runningLow.length}</Text>
          </View>
          {runningLow.slice(0, 3).map((p) => (
            <ProductCard key={p.id} product={p} onPress={() => router.push(`/product/${p.id}`)} />
          ))}
        </View>
      )}

      {/* My List preview */}
      {myListItems.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My List</Text>
            <Pressable onPress={() => router.push('/(tabs)/list')} hitSlop={8}>
              <Text style={[styles.seeMoreTxt, { color: colors.primary }]}>View all</Text>
            </Pressable>
          </View>
          <View style={[styles.listPreview, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            {myListItems.slice(0, 5).map((item) => {
              const linked = item.productId ? products.find((p) => p.id === item.productId) : undefined;
              return (
                <View key={item.id} style={[styles.listPreviewRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.listThumb, { backgroundColor: colors.muted }]}>
                    {linked?.imageUri ? (
                      <Image source={{ uri: linked.imageUri }} style={styles.listThumbImg} resizeMode="cover" />
                    ) : (
                      <Package size={16} color={colors.mutedForeground} />
                    )}
                  </View>
                  <Text
                    style={[styles.listPreviewName, { color: item.checked ? colors.mutedForeground : colors.foreground, textDecorationLine: item.checked ? 'line-through' : 'none' }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  {item.isAuto && (
                    <View style={[styles.autoBadge, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.autoBadgeTxt, { color: colors.primary }]}>Auto</Text>
                    </View>
                  )}
                  <Text style={[styles.listQty, { color: colors.mutedForeground }]}>
                    {item.quantity} {item.unit}
                  </Text>
                </View>
              );
            })}
            {myListItems.length > 5 && (
              <Pressable onPress={() => router.push('/(tabs)/list')} style={styles.listPreviewMore}>
                <Text style={[styles.seeMoreTxt, { color: colors.mutedForeground }]}>
                  +{myListItems.length - 5} more items
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Empty state */}
      {products.length === 0 && (
        <View style={{ paddingTop: 24 }}>
          <EmptyState
            icon={ShoppingBag}
            title="Welcome to Smart Shopping"
            subtitle="Scan barcodes to add products, track your consumption, and get automatic shopping suggestions."
          />
          <Pressable
            onPress={() => router.push('/(tabs)/scan')}
            style={[styles.scanBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          >
            <Camera size={20} color={colors.primaryForeground} />
            <Text style={[styles.scanBtnTxt, { color: colors.primaryForeground }]}>Scan your first product</Text>
          </Pressable>
        </View>
      )}
        </>
      )}
    </ScrollView>
  );
}

function StatCard({
  icon,
  value,
  label,
  color,
  bg,
  onPress,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  color: string;
  bg: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const Icon = icon;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.statCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Icon size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    height: 40,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  noResults: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 16,
    paddingVertical: 20,
    textAlign: 'center',
  },
  header: { paddingHorizontal: 20, marginBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 2 },
  date: { fontSize: 22, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  transferBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  transferBtnTxt: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 8 },
  statCard: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  section: { marginTop: 24 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold', flex: 1 },
  sectionCount: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  seeMore: { alignItems: 'center', paddingVertical: 12 },
  seeMoreTxt: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  listPreview: {
    marginHorizontal: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  listPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  listDot: { width: 8, height: 8, borderRadius: 4 },
  listThumb: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  listThumbImg: { width: 32, height: 32, borderRadius: 8 },
  listQty: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  listPreviewName: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  autoBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  autoBadgeTxt: { fontSize: 10, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  listPreviewMore: { paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center' },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 32,
    marginTop: 20,
    paddingVertical: 16,
  },
  scanBtnTxt: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
