import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useShopping } from '@/context/ShoppingContext';
import { lookupBarcode } from '@/lib/productLookup';
import AddProductModal, { ProductFormData } from '@/components/AddProductModal';
import ConsumeModal from '@/components/ConsumeModal';
import { Product } from '@/lib/storage';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function ScanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getProductByBarcode, addProduct, logConsumption, logRestock } = useShopping();

  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [looking, setLooking] = useState(false);
  const [webBarcode, setWebBarcode] = useState('');

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [consumeModalVisible, setConsumeModalVisible] = useState(false);
  const [pendingBarcode, setPendingBarcode] = useState('');
  const [pendingProduct, setPendingProduct] = useState<Partial<ProductFormData>>({});
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);

  const lastScannedRef = useRef<string | null>(null);
  const cooldownRef = useRef(false);

  const handleBarcode = useCallback(
    async (barcode: string) => {
      if (cooldownRef.current || barcode === lastScannedRef.current) return;
      cooldownRef.current = true;
      lastScannedRef.current = barcode;
      setScanning(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const existing = getProductByBarcode(barcode);
      if (existing) {
        setActiveProduct(existing);
        setConsumeModalVisible(true);
        cooldownRef.current = false;
        return;
      }

      setLooking(true);
      const info = await lookupBarcode(barcode);
      setLooking(false);

      setPendingBarcode(barcode);
      setPendingProduct({
        barcode,
        name: info?.name ?? '',
        brand: info?.brand ?? '',
        category: info?.category ?? '',
        unit: 'unit',
        currentQuantity: 1,
        minThreshold: 1,
      });
      setAddModalVisible(true);
      cooldownRef.current = false;
    },
    [getProductByBarcode],
  );

  const handleAddConfirm = (data: ProductFormData) => {
    addProduct(data);
    setAddModalVisible(false);
    lastScannedRef.current = null;
    setScanning(true);
  };

  const handleAddCancel = () => {
    setAddModalVisible(false);
    lastScannedRef.current = null;
    setScanning(true);
  };

  const handleConsumeClose = () => {
    setConsumeModalVisible(false);
    setActiveProduct(null);
    lastScannedRef.current = null;
    setScanning(true);
  };

  // Web: manual input
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webContainer, { backgroundColor: colors.background, paddingTop: insets.top + 67 }]}>
        <View style={[styles.webCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Feather name="camera-off" size={36} color={colors.mutedForeground} />
          <Text style={[styles.webTitle, { color: colors.foreground }]}>Camera unavailable on web</Text>
          <Text style={[styles.webSub, { color: colors.mutedForeground }]}>
            Enter a barcode manually to look up or add a product.
          </Text>
          <TextInput
            style={[styles.webInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted, borderRadius: colors.radius - 4 }]}
            placeholder="Enter barcode (e.g. 0012345678905)"
            placeholderTextColor={colors.mutedForeground}
            value={webBarcode}
            onChangeText={setWebBarcode}
            keyboardType="numeric"
            returnKeyType="search"
            onSubmitEditing={() => {
              if (webBarcode.trim()) handleBarcode(webBarcode.trim());
            }}
          />
          <Pressable
            onPress={() => { if (webBarcode.trim()) handleBarcode(webBarcode.trim()); }}
            style={[styles.webBtn, { backgroundColor: colors.primary, borderRadius: colors.radius - 2 }]}
          >
            <Text style={[styles.webBtnTxt, { color: colors.primaryForeground }]}>Look up</Text>
          </Pressable>
        </View>

        <AddProductModal
          visible={addModalVisible}
          initialData={pendingProduct}
          onConfirm={handleAddConfirm}
          onCancel={handleAddCancel}
        />
        <ConsumeModal
          visible={consumeModalVisible}
          product={activeProduct}
          onConsume={logConsumption}
          onRestock={logRestock}
          onCancel={handleConsumeClose}
        />
      </View>
    );
  }

  // Permission not yet determined
  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, gap: 16 }]}>
        <Feather name="camera-off" size={40} color={colors.mutedForeground} />
        <Text style={[styles.permTitle, { color: colors.foreground }]}>Camera access needed</Text>
        <Text style={[styles.permSub, { color: colors.mutedForeground }]}>
          Scanning barcodes requires camera permission.
        </Text>
        {permission.canAskAgain && (
          <Pressable
            onPress={requestPermission}
            style={[styles.permBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          >
            <Text style={{ color: colors.primaryForeground, fontWeight: '600', fontSize: 16 }}>Allow Camera</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={
          scanning
            ? ({ data }) => handleBarcode(data)
            : undefined
        }
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
        }}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.scanTitle}>Scan Barcode</Text>
        </View>

        {/* Scan frame */}
        <View style={styles.frameArea}>
          <View style={styles.scanFrame}>
            {/* Corners */}
            <View style={[styles.corner, styles.topLeft, { borderColor: '#fff' }]} />
            <View style={[styles.corner, styles.topRight, { borderColor: '#fff' }]} />
            <View style={[styles.corner, styles.bottomLeft, { borderColor: '#fff' }]} />
            <View style={[styles.corner, styles.bottomRight, { borderColor: '#fff' }]} />
          </View>
          {looking && (
            <View style={styles.lookingBox}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.lookingTxt}>Looking up product...</Text>
            </View>
          )}
        </View>

        {/* Bottom hint */}
        <View style={[styles.bottomHint, { paddingBottom: insets.bottom + 100 }]}>
          <Text style={styles.hintTxt}>Point camera at a barcode</Text>
          <Text style={styles.hintSub}>
            Recognized products update your stock.{'\n'}New products will be added to your pantry.
          </Text>
        </View>
      </View>

      <AddProductModal
        visible={addModalVisible}
        initialData={pendingProduct}
        onConfirm={handleAddConfirm}
        onCancel={handleAddCancel}
      />
      <ConsumeModal
        visible={consumeModalVisible}
        product={activeProduct}
        onConsume={(id, qty) => { logConsumption(id, qty); handleConsumeClose(); }}
        onRestock={(id, qty) => { logRestock(id, qty); handleConsumeClose(); }}
        onCancel={handleConsumeClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  topBar: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  frameArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 260,
    height: 200,
    borderRadius: 4,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderWidth: 3,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  lookingBox: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  lookingTxt: { color: '#fff', fontSize: 14, fontFamily: 'Inter_500Medium' },
  bottomHint: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 24,
    gap: 6,
  },
  hintTxt: { color: '#fff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  hintSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', fontFamily: 'Inter_400Regular' },
  permTitle: { fontSize: 20, fontWeight: '700', fontFamily: 'Inter_700Bold', textAlign: 'center' },
  permSub: { fontSize: 15, textAlign: 'center', maxWidth: 260, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  permBtn: { paddingHorizontal: 28, paddingVertical: 14 },
  webContainer: { flex: 1, padding: 24, gap: 0 },
  webCard: {
    padding: 28,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
  },
  webTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', textAlign: 'center' },
  webSub: { fontSize: 14, textAlign: 'center', maxWidth: 260, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  webInput: {
    width: '100%',
    height: 46,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
  },
  webBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginTop: 4,
  },
  webBtnTxt: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
