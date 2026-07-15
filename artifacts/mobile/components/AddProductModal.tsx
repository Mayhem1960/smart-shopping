import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ProductFormData {
  barcode: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  currentQuantity: number;
  minThreshold: number;
}

interface Props {
  visible: boolean;
  initialData: Partial<ProductFormData>;
  onConfirm: (data: ProductFormData) => void;
  onCancel: () => void;
}

const UNITS = ['unit', 'g', 'kg', 'ml', 'L', 'oz', 'lb', 'pack'];

export default function AddProductModal({ visible, initialData, onConfirm, onCancel }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(initialData.name ?? '');
  const [brand, setBrand] = useState(initialData.brand ?? '');
  const [category, setCategory] = useState(initialData.category ?? '');
  const [unit, setUnit] = useState(initialData.unit ?? 'unit');
  const [currentQty, setCurrentQty] = useState(String(initialData.currentQuantity ?? 1));
  const [minThreshold, setMinThreshold] = useState(String(initialData.minThreshold ?? 1));

  // Reset when modal opens
  React.useEffect(() => {
    if (visible) {
      setName(initialData.name ?? '');
      setBrand(initialData.brand ?? '');
      setCategory(initialData.category ?? '');
      setUnit(initialData.unit ?? 'unit');
      setCurrentQty(String(initialData.currentQuantity ?? 1));
      setMinThreshold(String(initialData.minThreshold ?? 1));
    }
  }, [visible]);

  const handleSave = () => {
    if (!name.trim()) return;
    onConfirm({
      barcode: initialData.barcode ?? '',
      name: name.trim(),
      brand: brand.trim(),
      category: category.trim(),
      unit,
      currentQuantity: parseFloat(currentQty) || 1,
      minThreshold: parseFloat(minThreshold) || 1,
    });
  };

  const labelStyle = [styles.label, { color: colors.mutedForeground }];
  const inputStyle = [
    styles.input,
    { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius - 4 },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onCancel} hitSlop={8}>
            <Text style={[styles.cancel, { color: colors.mutedForeground }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Add Product</Text>
          <Pressable onPress={handleSave} hitSlop={8} disabled={!name.trim()}>
            <Text style={[styles.save, { color: name.trim() ? colors.primary : colors.mutedForeground }]}>Save</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={labelStyle}>Product Name *</Text>
          <TextInput
            style={inputStyle}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Whole Milk"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="next"
          />

          <Text style={labelStyle}>Brand</Text>
          <TextInput
            style={inputStyle}
            value={brand}
            onChangeText={setBrand}
            placeholder="e.g. Organic Valley"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="next"
          />

          <Text style={labelStyle}>Category</Text>
          <TextInput
            style={inputStyle}
            value={category}
            onChangeText={setCategory}
            placeholder="e.g. dairy"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="next"
          />

          <Text style={labelStyle}>Unit</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitRow}>
            {UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                onPress={() => setUnit(u)}
                style={[
                  styles.unitChip,
                  {
                    backgroundColor: unit === u ? colors.primary : colors.muted,
                    borderRadius: 20,
                  },
                ]}
              >
                <Text style={{ color: unit === u ? colors.primaryForeground : colors.foreground, fontSize: 14, fontWeight: '500' }}>
                  {u}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={labelStyle}>Current Quantity</Text>
          <TextInput
            style={inputStyle}
            value={currentQty}
            onChangeText={setCurrentQty}
            placeholder="1"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
          />

          <Text style={labelStyle}>Low Stock Threshold</Text>
          <TextInput
            style={inputStyle}
            value={minThreshold}
            onChangeText={setMinThreshold}
            placeholder="1"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
          />
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            You'll be alerted to restock when quantity falls to this level.
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  },
  cancel: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  save: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  form: {
    padding: 20,
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: 'Inter_600SemiBold',
    marginTop: 8,
  },
  input: {
    height: 46,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  unitRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  unitChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  hint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
});
