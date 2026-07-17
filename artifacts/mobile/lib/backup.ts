import {
  cacheDirectory,
  writeAsStringAsync,
  readAsStringAsync,
  EncodingType,
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { loadProducts, loadShoppingList, saveProducts, saveShoppingList } from './storage';
import { Product, ShoppingItem } from './storage';

export interface BackupData {
  version: number;
  exportedAt: string;
  products: Product[];
  shoppingList: ShoppingItem[];
}

const BACKUP_VERSION = 1;
const BACKUP_FILENAME = 'SmartShopping_backup.json';

/** Serialise the full database to a temp file and open the share sheet. */
export async function exportDatabase(): Promise<void> {
  const [products, shoppingList] = await Promise.all([
    loadProducts(),
    loadShoppingList(),
  ]);

  const payload: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    products,
    shoppingList,
  };

  const path = (cacheDirectory ?? '') + BACKUP_FILENAME;
  await writeAsStringAsync(path, JSON.stringify(payload, null, 2), {
    encoding: EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(path, {
    mimeType: 'application/json',
    dialogTitle: 'Send database via Bluetooth or another app',
    UTI: 'public.json',
  });
}

/** Pick a backup JSON file and restore it into AsyncStorage. */
export async function importDatabase(): Promise<{ products: number; shoppingList: number }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    throw new Error('CANCELLED');
  }

  const raw = await readAsStringAsync(result.assets[0].uri, {
    encoding: EncodingType.UTF8,
  });

  let data: BackupData;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (!data.products || !Array.isArray(data.products)) {
    throw new Error('The file does not appear to be a Smart Shopping backup.');
  }

  await Promise.all([
    saveProducts(data.products),
    saveShoppingList(data.shoppingList ?? []),
  ]);

  return {
    products: data.products.length,
    shoppingList: (data.shoppingList ?? []).length,
  };
}
