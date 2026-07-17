import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useShopping } from '@/context/ShoppingContext';
import { exportDatabase, importDatabase } from '@/lib/backup';
import {
  Bluetooth,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  Database,
} from 'lucide-react-native';

type Status = 'idle' | 'busy' | 'success' | 'error';

export default function TransferScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { products, shoppingList, reloadData } = useShopping();

  const [exportStatus, setExportStatus] = useState<Status>('idle');
  const [importStatus, setImportStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const handleExport = async () => {
    setExportStatus('busy');
    setMessage('');
    try {
      await exportDatabase();
      setExportStatus('success');
      setMessage('Database shared successfully. Choose Bluetooth from the share sheet to send it wirelessly.');
    } catch (e: any) {
      setExportStatus('error');
      setMessage(e.message ?? 'Export failed.');
    }
  };

  const handleImport = async () => {
    Alert.alert(
      'Import Database',
      'This will replace all current products and shopping list data with the backup. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'destructive',
          onPress: async () => {
            setImportStatus('busy');
            setMessage('');
            try {
              const counts = await importDatabase();
              await reloadData();
              setImportStatus('success');
              setMessage(
                `Imported ${counts.products} product${counts.products !== 1 ? 's' : ''} and ${counts.shoppingList} shopping item${counts.shoppingList !== 1 ? 's' : ''}.`,
              );
            } catch (e: any) {
              if (e.message === 'CANCELLED') {
                setImportStatus('idle');
                return;
              }
              setImportStatus('error');
              setMessage(e.message ?? 'Import failed.');
            }
          },
        },
      ],
    );
  };

  const statusIcon = (status: Status, size = 20) => {
    if (status === 'success') return <CheckCircle size={size} color={colors.ok} />;
    if (status === 'error') return <AlertCircle size={size} color={colors.critical} />;
    return null;
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingTop: insets.top + 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Data Transfer</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Info banner */}
      <View style={[styles.banner, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
        <Bluetooth size={20} color={colors.primary} />
        <Text style={[styles.bannerText, { color: colors.foreground }]}>
          Use <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.primary }}>Export</Text> to share your database with another device via Bluetooth, email, or any app. Use <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.primary }}>Import</Text> to restore a backup you received.
        </Text>
      </View>

      {/* Stats */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.statRow}>
          <Database size={16} color={colors.mutedForeground} />
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Current database</Text>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{products.length}</Text>
            <Text style={[styles.statSub, { color: colors.mutedForeground }]}>Products</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{shoppingList.length}</Text>
            <Text style={[styles.statSub, { color: colors.mutedForeground }]}>Shopping items</Text>
          </View>
        </View>
      </View>

      {/* Export */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Export Database</Text>
        <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
          Saves your pantry and shopping list to a <Text style={{ fontFamily: 'Inter_500Medium' }}>.json</Text> file and opens the share sheet. Tap Bluetooth in the share sheet to send wirelessly.
        </Text>
        <Pressable
          onPress={handleExport}
          disabled={exportStatus === 'busy'}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              backgroundColor: exportStatus === 'busy' ? colors.muted : colors.primary,
              borderRadius: colors.radius - 2,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Upload size={18} color={exportStatus === 'busy' ? colors.mutedForeground : colors.primaryForeground} />
          <Text style={[styles.actionBtnTxt, { color: exportStatus === 'busy' ? colors.mutedForeground : colors.primaryForeground }]}>
            {exportStatus === 'busy' ? 'Preparing…' : 'Export & Share'}
          </Text>
          {statusIcon(exportStatus)}
        </Pressable>
        {exportStatus !== 'idle' && exportStatus !== 'busy' && (
          <Text style={[styles.statusMsg, { color: exportStatus === 'success' ? colors.ok : colors.critical }]}>
            {message}
          </Text>
        )}
      </View>

      {/* Import */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Import Database</Text>
        <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
          Pick a <Text style={{ fontFamily: 'Inter_500Medium' }}>.json</Text> backup file received via Bluetooth or another app. This will overwrite your current data.
        </Text>
        <Pressable
          onPress={handleImport}
          disabled={importStatus === 'busy'}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              backgroundColor: colors.card,
              borderWidth: 1.5,
              borderColor: importStatus === 'busy' ? colors.border : colors.primary,
              borderRadius: colors.radius - 2,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Download size={18} color={importStatus === 'busy' ? colors.mutedForeground : colors.primary} />
          <Text style={[styles.actionBtnTxt, { color: importStatus === 'busy' ? colors.mutedForeground : colors.primary }]}>
            {importStatus === 'busy' ? 'Importing…' : 'Import from File'}
          </Text>
          {statusIcon(importStatus)}
        </Pressable>
        {importStatus !== 'idle' && importStatus !== 'busy' && (
          <Text style={[styles.statusMsg, { color: importStatus === 'success' ? colors.ok : colors.critical }]}>
            {message}
          </Text>
        )}
      </View>

      {/* How-to */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>How to Transfer via Bluetooth</Text>
        {[
          ['On this device', 'Tap "Export & Share", then choose Bluetooth from the share sheet. Select the other device.'],
          ['On the other device', 'Accept the incoming file when prompted by Android.'],
          ['Open the file', 'On the receiving device, open Smart Shopping → Data Transfer → Import. Select the received .json file.'],
        ].map(([step, desc], i) => (
          <View key={i} style={styles.stepRow}>
            <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
              <Text style={[styles.stepNumTxt, { color: colors.primaryForeground }]}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>{step}</Text>
              <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>{desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { padding: 6 },
  title: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  bannerText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  card: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statLabel: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  statsGrid: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: 36, marginHorizontal: 8 },
  statValue: { fontSize: 28, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  statSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  cardTitle: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  cardDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  actionBtnTxt: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold', flex: 1 },
  statusMsg: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  stepRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  stepNumTxt: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  stepTitle: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  stepDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
});
