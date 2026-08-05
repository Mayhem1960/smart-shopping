import React, { useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useShopping } from '@/context/ShoppingContext';
import StockBar from '@/components/StockBar';
import ConsumeModal from '@/components/ConsumeModal';
import { Package, Camera, Trash2, Activity, Pencil, X, Hash, TrendingDown, TrendingUp } from 'lucide-react-native';
import { formatDaysLeft, getAvgDailyConsumption, getDaysUntilEmpty, getNextBuyDate, getStockStatus } from '@/lib/predictions';

const STATUS_LABELS: Record<string, string> = {
  ok: 'In Stock',
  low: 'Running Low',
  critical: 'Critical',
  out: 'Out of Stock',
};

async function pickProductImage(source: 'camera' | 'library'): Promise<string | null> {
  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take a photo.');
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
    });
    return result.canceled ? null : result.assets[0].uri;
  } else {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required to choose a photo.');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
    });
    return result.canceled ? null : result.assets[0].uri;
  }
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { products, updateProduct, deleteProduct, logConsumption, logRestock } = useShopping();

  const scrollRef = useRef<ScrollView>(null);

  const [consumeVisible, setConsumeVisible] = useState(false);
  const [editThreshold, setEditThreshold] = useState(false);
  const [thresholdVal, setThresholdVal] = useState('');
  const [editCategory, setEditCategory] = useState(false);
  const [categoryVal, setCategoryVal] = useState('');

  // Derive product from reactive products array so the screen re-renders immediately
  // after logConsumption / logRestock updates the context state.
  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Product not found</Text>
      </View>
    );
  }

  const status = getStockStatus(product);
  const days = getDaysUntilEmpty(product);
  const avg = getAvgDailyConsumption(product);
  const nextBuy = getNextBuyDate(product);

  const statusColor =
    status === 'ok' ? colors.ok : status === 'low' ? colors.warning : status === 'critical' ? colors.critical : colors.out;

  const handleDelete = () => {
    Alert.alert('Delete Product', `Remove "${product.name}" from your pantry?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteProduct(product.id);
          router.back();
        },
      },
    ]);
  };

  const handleSaveThreshold = () => {
    const val = parseFloat(thresholdVal);
    if (!isNaN(val) && val >= 0) updateProduct(product.id, { minThreshold: val });
    setEditThreshold(false);
  };

  const handleSaveCategory = () => {
    updateProduct(product.id, { category: categoryVal.trim() || undefined });
    setEditCategory(false);
  };

  const handleChangeImage = () => {
    const options = ['Cancel', 'Take Photo', 'Choose from Library', ...(product.imageUri ? ['Remove Photo'] : [])];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          destructiveButtonIndex: product.imageUri ? 3 : undefined,
        },
        async (index) => {
          if (index === 1) {
            const uri = await pickProductImage('camera');
            if (uri) updateProduct(product.id, { imageUri: uri });
          } else if (index === 2) {
            const uri = await pickProductImage('library');
            if (uri) updateProduct(product.id, { imageUri: uri });
          } else if (index === 3 && product.imageUri) {
            updateProduct(product.id, { imageUri: undefined });
          }
        },
      );
    } else {
      Alert.alert('Product Photo', 'Choose a source', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Take Photo',
          onPress: async () => {
            const uri = await pickProductImage('camera');
            if (uri) updateProduct(product.id, { imageUri: uri });
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            const uri = await pickProductImage('library');
            if (uri) updateProduct(product.id, { imageUri: uri });
          },
        },
        ...(product.imageUri
          ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: () => updateProduct(product.id, { imageUri: undefined }) }]
          : []),
      ]);
    }
  };

  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? insets.top + 67 : 0;

  const recentEvents = [...product.usageHistory].reverse().slice(0, 10);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
    <ScrollView
      ref={scrollRef}
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingTop: topPad }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.heroTop}>
          {/* Image / placeholder — tappable */}
          <TouchableOpacity onPress={handleChangeImage} activeOpacity={0.8} style={styles.heroImageWrap}>
            <View style={[styles.heroImageCircle, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              {product.imageUri ? (
                <Image
                  source={{ uri: product.imageUri }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
              ) : (
                <Package size={32} color={colors.mutedForeground} />
              )}
            </View>
            {/* Edit badge */}
            <View style={[styles.heroImageBadge, { backgroundColor: colors.primary }]}>
              <Camera size={11} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Delete button top-right */}
          <Pressable onPress={handleDelete} hitSlop={8} style={styles.deleteBtn}>
            <Trash2 size={20} color={colors.destructive} />
          </Pressable>
        </View>

        <Text style={[styles.heroName, { color: colors.foreground }]}>{product.name}</Text>
        {product.brand && (
          <Text style={[styles.heroBrand, { color: colors.mutedForeground }]}>{product.brand}</Text>
        )}
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusTxt, { color: statusColor }]}>{STATUS_LABELS[status]}</Text>
        </View>
      </View>

      {/* Stock card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.cardRow}>
          <View>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Current Stock</Text>
            <Text style={[styles.bigNumber, { color: colors.foreground }]}>
              {product.currentQuantity}
              <Text style={[styles.bigUnit, { color: colors.mutedForeground }]}> {product.unit}</Text>
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setConsumeVisible(true)}
            style={[styles.logBtn, { backgroundColor: colors.primary, borderRadius: colors.radius - 2 }]}
          >
            <Activity size={16} color={colors.primaryForeground} />
            <Text style={[styles.logBtnTxt, { color: colors.primaryForeground }]}>Log</Text>
          </TouchableOpacity>
        </View>
        <StockBar product={product} status={status} height={8} />
        <View style={styles.thresholdRow}>
          <Text style={[styles.thresholdLabel, { color: colors.mutedForeground }]}>
            Restock threshold: {product.minThreshold} {product.unit}
          </Text>
          <Pressable onPress={() => { setThresholdVal(String(product.minThreshold)); setEditThreshold(true); }} hitSlop={8}>
            <Pencil size={13} color={colors.primary} />
          </Pressable>
        </View>
        {editThreshold && (
          <View style={styles.editThreshRow}>
            <TextInput
              style={[styles.editThreshInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted, borderRadius: colors.radius - 4 }]}
              value={thresholdVal}
              onChangeText={setThresholdVal}
              keyboardType="decimal-pad"
              autoFocus
            />
            <TouchableOpacity onPress={handleSaveThreshold} style={[styles.saveThreshBtn, { backgroundColor: colors.primary, borderRadius: colors.radius - 4 }]}>
              <Text style={{ color: '#fff', fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>Save</Text>
            </TouchableOpacity>
            <Pressable onPress={() => setEditThreshold(false)} hitSlop={8}>
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        )}
      </View>

      {/* Predictions */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <Text style={[styles.cardSectionTitle, { color: colors.foreground }]}>Predictions</Text>
        <View style={styles.predGrid}>
          <PredItem label="Days left" value={formatDaysLeft(days)} color={days !== null && days < 5 ? colors.critical : colors.foreground} colors={colors} />
          <PredItem label="Avg per day" value={avg ? `${avg.toFixed(2)} ${product.unit}` : '—'} colors={colors} />
          <PredItem
            label="Buy before"
            value={nextBuy ? nextBuy.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
            colors={colors}
          />
          <PredItem label="Usage events" value={String(product.usageHistory.filter((e) => e.type === 'consume').length)} colors={colors} />
        </View>
        {avg === null && (
          <Text style={[styles.predNote, { color: colors.mutedForeground }]}>
            Log at least one usage event to see consumption predictions.
          </Text>
        )}
      </View>

      {/* Barcode + Category */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.barcodeRow}>
          <Hash size={14} color={colors.mutedForeground} />
          <Text style={[styles.barcodeVal, { color: colors.mutedForeground }]}>{product.barcode || 'No barcode'}</Text>
        </View>
        {/* Category row — always visible, always editable */}
        <View style={styles.thresholdRow}>
          <Text style={[styles.thresholdLabel, { color: colors.mutedForeground }]}>
            Category:{' '}
            {product.category ? (
              <Text style={{ color: colors.foreground, fontFamily: 'Inter_500Medium' }}>{product.category}</Text>
            ) : (
              <Text style={{ fontStyle: 'italic' }}>None</Text>
            )}
          </Text>
          <Pressable
            onPress={() => { setCategoryVal(product.category ?? ''); setEditCategory(true); }}
            hitSlop={8}
          >
            <Pencil size={13} color={colors.primary} />
          </Pressable>
        </View>
        {editCategory && (
          <View style={styles.editThreshRow}>
            <TextInput
              style={[
                styles.editCatInput,
                { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted, borderRadius: colors.radius - 4 },
              ]}
              value={categoryVal}
              onChangeText={setCategoryVal}
              placeholder="e.g. Dairy"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveCategory}
              onFocus={() => {
                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
              }}
            />
            <TouchableOpacity
              onPress={handleSaveCategory}
              style={[styles.saveThreshBtn, { backgroundColor: colors.primary, borderRadius: colors.radius - 4 }]}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>Save</Text>
            </TouchableOpacity>
            <Pressable onPress={() => setEditCategory(false)} hitSlop={8}>
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        )}
      </View>

      {/* History */}
      {recentEvents.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.cardSectionTitle, { color: colors.foreground }]}>Recent History</Text>
          {recentEvents.map((e) => (
            <View key={e.id} style={[styles.eventRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.eventIcon, { backgroundColor: e.type === 'consume' ? colors.critical + '20' : colors.ok + '20' }]}>
                {e.type === 'consume' ? <TrendingDown size={14} color={colors.critical} /> : <TrendingUp size={14} color={colors.ok} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.eventLabel, { color: colors.foreground }]}>
                  {e.type === 'consume' ? 'Used' : 'Restocked'} {e.quantity} {product.unit}
                </Text>
                <Text style={[styles.eventDate, { color: colors.mutedForeground }]}>
                  {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <ConsumeModal
        visible={consumeVisible}
        product={product}
        onConsume={(id, qty) => { logConsumption(id, qty); setConsumeVisible(false); }}
        onRestock={(id, qty) => { logRestock(id, qty); setConsumeVisible(false); }}
        onCancel={() => setConsumeVisible(false)}
      />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PredItem({ label, value, color, colors }: { label: string; value: string; color?: string; colors: ReturnType<typeof import('@/hooks/useColors').useColors> }) {
  return (
    <View style={styles.predItem}>
      <Text style={[styles.predLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.predValue, { color: color ?? colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: {
    padding: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 6,
  },
  heroTop: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  heroImageWrap: {
    position: 'relative',
  },
  heroImageCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  heroImageBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: { padding: 8 },
  heroName: { fontSize: 22, fontWeight: '700', fontFamily: 'Inter_700Bold', textAlign: 'center' },
  heroBrand: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusTxt: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 2 },
  bigNumber: { fontSize: 36, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  bigUnit: { fontSize: 18, fontWeight: '400' },
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  logBtnTxt: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  thresholdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thresholdLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1 },
  editThreshRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  editThreshInput: { height: 38, borderWidth: 1, paddingHorizontal: 10, fontSize: 15, width: 80, fontFamily: 'Inter_400Regular' },
  editCatInput: { height: 38, borderWidth: 1, paddingHorizontal: 10, fontSize: 15, flex: 1, fontFamily: 'Inter_400Regular' },
  saveThreshBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  cardSectionTitle: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  predGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  predItem: { width: '45%', gap: 3 },
  predLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', textTransform: 'uppercase', letterSpacing: 0.4 },
  predValue: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  predNote: { fontSize: 12, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
  barcodeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barcodeVal: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catTxt: { fontSize: 11, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  eventIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  eventLabel: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  eventDate: { fontSize: 11, fontFamily: 'Inter_400Regular' },
});
