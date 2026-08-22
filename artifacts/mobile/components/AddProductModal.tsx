import React, { useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColors';
import { useShopping } from '@/context/ShoppingContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Pencil, ChevronDown } from 'lucide-react-native';

export interface ProductFormData {
  barcode: string;
  name: string;
  brand: string;
  category: string;
  imageUri?: string;
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

/** Capitalise the first letter of every word */
function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

async function pickImage(source: 'camera' | 'library'): Promise<string | null> {
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

export default function AddProductModal({ visible, initialData, onConfirm, onCancel }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products } = useShopping();

  const [name, setName] = useState(initialData.name ?? '');
  const [brand, setBrand] = useState(initialData.brand ?? '');
  const [category, setCategory] = useState(initialData.category ?? '');
  const [imageUri, setImageUri] = useState<string | undefined>(initialData.imageUri);
  const [unit, setUnit] = useState(initialData.unit ?? 'unit');
  const [currentQty, setCurrentQty] = useState(String(initialData.currentQuantity ?? 1));
  const [minThreshold, setMinThreshold] = useState(String(initialData.minThreshold ?? 1));
  const [catOpen, setCatOpen] = useState(false);

  // Existing categories already used across the pantry, for the quick-fill dropdown.
  const existingCategories = React.useMemo(
    () =>
      Array.from(
        new Set(products.map((p) => p.category?.trim()).filter((c): c is string => !!c)),
      ).sort((a, b) => a.localeCompare(b)),
    [products],
  );
  const filteredCategories = category.trim()
    ? existingCategories.filter((c) => c.toLowerCase().includes(category.trim().toLowerCase()))
    : existingCategories;

  // Reset when modal opens
  React.useEffect(() => {
    if (visible) {
      setName(initialData.name ?? '');
      setBrand(initialData.brand ?? '');
      setCategory(initialData.category ?? '');
      setImageUri(initialData.imageUri);
      setUnit(initialData.unit ?? 'unit');
      setCurrentQty(String(initialData.currentQuantity ?? 1));
      setMinThreshold(String(initialData.minThreshold ?? 1));
      setCatOpen(false);
    }
  }, [visible]);

  const handleSave = () => {
    if (!name.trim()) return;
    const parsedThreshold = parseFloat(minThreshold);
    onConfirm({
      barcode: initialData.barcode ?? '',
      name: toTitleCase(name.trim()),
      brand: toTitleCase(brand.trim()),
      category: category.trim(),
      imageUri,
      unit,
      currentQuantity: parseFloat(currentQty) || 1,
      // Allow 0 ("never auto-restock"); only fall back to 1 for blank/invalid input.
      minThreshold: Number.isNaN(parsedThreshold) ? 1 : parsedThreshold,
    });
  };

  const handleImagePress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library', ...(imageUri ? ['Remove Photo'] : [])],
          cancelButtonIndex: 0,
          destructiveButtonIndex: imageUri ? 3 : undefined,
        },
        async (index) => {
          if (index === 1) {
            const uri = await pickImage('camera');
            if (uri) setImageUri(uri);
          } else if (index === 2) {
            const uri = await pickImage('library');
            if (uri) setImageUri(uri);
          } else if (index === 3 && imageUri) {
            setImageUri(undefined);
          }
        },
      );
    } else {
      Alert.alert('Product Photo', 'Choose a source', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Take Photo',
          onPress: async () => {
            const uri = await pickImage('camera');
            if (uri) setImageUri(uri);
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            const uri = await pickImage('library');
            if (uri) setImageUri(uri);
          },
        },
        ...(imageUri
          ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: () => setImageUri(undefined) }]
          : []),
      ]);
    }
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
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

        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {/* Image picker */}
          <View style={styles.imagePicker}>
            <TouchableOpacity onPress={handleImagePress} activeOpacity={0.8}>
              <View style={[styles.imageCircle, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.imageCircleImg}
                    onError={() => setImageUri(undefined)}
                  />
                ) : (
                  <Camera size={28} color={colors.mutedForeground} />
                )}
                <View style={[styles.imageEditBadge, { backgroundColor: colors.primary }]}>
                  <Pencil size={10} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>
            <Text style={[styles.imageHint, { color: colors.mutedForeground }]}>
              {imageUri ? 'Tap to change photo' : 'Tap to add photo'}
            </Text>
          </View>

          <Text style={labelStyle}>Product Name *</Text>
          <TextInput
            style={inputStyle}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            placeholder="e.g. Whole Milk"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="next"
          />

          <Text style={labelStyle}>Brand</Text>
          <TextInput
            style={inputStyle}
            value={brand}
            onChangeText={setBrand}
            autoCapitalize="words"
            placeholder="e.g. Organic Valley"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="next"
          />

          <Text style={labelStyle}>Category</Text>
          <View style={styles.catRow}>
            <TextInput
              style={[inputStyle, { flex: 1 }]}
              value={category}
              onChangeText={(t) => { setCategory(t); if (!catOpen) setCatOpen(true); }}
              autoCapitalize="words"
              placeholder="e.g. Dairy"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="next"
            />
            {existingCategories.length > 0 && (
              <TouchableOpacity
                onPress={() => setCatOpen((o) => !o)}
                style={[styles.catToggle, { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: colors.radius - 4 }]}
              >
                <ChevronDown size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
          {catOpen && filteredCategories.length > 0 && (
            <View style={[styles.catDropdown, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 4 }]}>
              {filteredCategories.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => { setCategory(c); setCatOpen(false); }}
                  style={[styles.catOption, { borderBottomColor: colors.border }]}
                >
                  <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: 'Inter_400Regular' }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

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
            selectTextOnFocus
          />

          <Text style={labelStyle}>Low Stock Threshold</Text>
          <TextInput
            style={inputStyle}
            value={minThreshold}
            onChangeText={setMinThreshold}
            placeholder="1"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            You'll be alerted to restock when quantity falls to this level.
          </Text>

          <View style={{ height: 60 }} />
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
  imagePicker: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  imageCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageCircleImg: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  imageEditBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
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
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catToggle: {
    width: 46,
    height: 46,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catDropdown: {
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
    maxHeight: 200,
  },
  catOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
