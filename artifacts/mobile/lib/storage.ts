import AsyncStorage from '@react-native-async-storage/async-storage';

const PRODUCTS_KEY = '@smartshopping/products';
const SHOPPING_LIST_KEY = '@smartshopping/shoppinglist';

export async function loadProducts(): Promise<Product[]> {
  try {
    const raw = await AsyncStorage.getItem(PRODUCTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveProducts(products: Product[]): Promise<void> {
  await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

export async function loadShoppingList(): Promise<ShoppingItem[]> {
  try {
    const raw = await AsyncStorage.getItem(SHOPPING_LIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveShoppingList(items: ShoppingItem[]): Promise<void> {
  await AsyncStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(items));
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
  imageUri?: string;
  unit: string;
  currentQuantity: number;
  minThreshold: number;
  usageHistory: UsageEvent[];
  addedAt: string;
}

export interface UsageEvent {
  id: string;
  date: string;
  quantity: number;
  type: 'consume' | 'restock';
}

export interface ShoppingItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  isAuto: boolean;
  addedAt: string;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
