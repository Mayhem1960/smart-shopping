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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Pencil } from 'lucide-react-native';

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

  const [name, setName] = useState(initialData.name ?? '');
  const [brand, setBrand] = useState(initialData.brand ?? '');
  const [category, setCategory] = useState(initialData.category ?? '');
  const [imageUri, setImageUri] = useState<string | undefined>(initialData.imageUri);
  const [unit, setUnit] = useState(initialData.unit ?? 'unit');
  const [currentQty, setCurrentQty] = useState(String(initialData.currentQuantity ?? 1));
  const [minThreshold, setMinThreshold] = useState(String(initialData.minThreshold ?? 1));

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
    }
  }, [visible]);

  const handleSave = () => {
    if (!name.trim()) return;
    onConfirm({
      barcode: initialData.barcode ?? '',
      name: name.trim(),
      brand: brand.trim(),
      category: category.trim(),
      imageUri,
      unit,
      currentQuantity: parseFloat(currentQty) || 1,
      minThreshold: parseFloat(minThreshold) || 1,
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
