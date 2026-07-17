import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  generateId,
  loadProducts,
  loadShoppingList,
  Product,
  saveProducts,
  saveShoppingList,
  ShoppingItem,
  UsageEvent,
} from '@/lib/storage';
import { getStockStatus, needsRestock } from '@/lib/predictions';

interface ShoppingContextType {
  products: Product[];
  shoppingList: ShoppingItem[];
  isLoaded: boolean;
  addProduct: (product: Omit<Product, 'id' | 'addedAt' | 'usageHistory'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  getProduct: (id: string) => Product | undefined;
  getProductByBarcode: (barcode: string) => Product | undefined;
  logConsumption: (productId: string, quantity: number) => void;
  logRestock: (productId: string, quantity: number) => void;
  addShoppingItem: (item: Omit<ShoppingItem, 'id' | 'addedAt'>) => void;
  removeShoppingItem: (id: string) => void;
  toggleShoppingItem: (id: string) => void;
  clearCheckedItems: () => void;
  syncAutoItems: () => void;
  reloadData: () => Promise<void>;
}

const ShoppingContext = createContext<ShoppingContextType | null>(null);

export function ShoppingProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const productsRef = useRef<Product[]>([]);
  const shoppingListRef = useRef<ShoppingItem[]>([]);

  useEffect(() => {
    (async () => {
      const [p, s] = await Promise.all([loadProducts(), loadShoppingList()]);
      setProducts(p);
      setShoppingList(s);
      productsRef.current = p;
      shoppingListRef.current = s;
      setIsLoaded(true);
    })();
  }, []);

  const setAndSaveProducts = useCallback((updater: (prev: Product[]) => Product[]) => {
    setProducts((prev) => {
      const next = updater(prev);
      productsRef.current = next;
      saveProducts(next);
      return next;
    });
  }, []);

  const setAndSaveList = useCallback((updater: (prev: ShoppingItem[]) => ShoppingItem[]) => {
    setShoppingList((prev) => {
      const next = updater(prev);
      shoppingListRef.current = next;
      saveShoppingList(next);
      return next;
    });
  }, []);

  const addProduct = useCallback(
    (data: Omit<Product, 'id' | 'addedAt' | 'usageHistory'>): Product => {
      const product: Product = {
        ...data,
        id: generateId(),
        addedAt: new Date().toISOString(),
        usageHistory: [],
      };
      setAndSaveProducts((prev) => [...prev, product]);
      return product;
    },
    [setAndSaveProducts],
  );

  const updateProduct = useCallback(
    (id: string, updates: Partial<Product>) => {
      setAndSaveProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    },
    [setAndSaveProducts],
  );

  const deleteProduct = useCallback(
    (id: string) => {
      setAndSaveProducts((prev) => prev.filter((p) => p.id !== id));
      setAndSaveList((prev) => prev.filter((i) => i.productId !== id));
    },
    [setAndSaveProducts, setAndSaveList],
  );

  const getProduct = useCallback(
    (id: string) => productsRef.current.find((p) => p.id === id),
    [],
  );

  const getProductByBarcode = useCallback(
    (barcode: string) => productsRef.current.find((p) => p.barcode === barcode),
    [],
  );

  const logConsumption = useCallback(
    (productId: string, quantity: number) => {
      const event: UsageEvent = {
        id: generateId(),
        date: new Date().toISOString(),
        quantity,
        type: 'consume',
      };
      setAndSaveProducts((prev) => {
        const updated = prev.map((p) =>
          p.id === productId
            ? {
                ...p,
                currentQuantity: Math.max(0, p.currentQuantity - quantity),
                usageHistory: [...p.usageHistory, event],
              }
            : p,
        );
        // Sync shopping list immediately after stock changes
        setAndSaveList((list) => {
          const existingAutoIds = new Set(
            list.filter((i) => i.isAuto && i.productId).map((i) => i.productId!),
          );
          const newItems: ShoppingItem[] = [];
          for (const product of updated) {
            if (needsRestock(product) && !existingAutoIds.has(product.id)) {
              newItems.push({
                id: generateId(),
                productId: product.id,
                name: product.name,
                quantity: product.minThreshold > 0 ? product.minThreshold : 1,
                unit: product.unit,
                checked: false,
                isAuto: true,
                addedAt: new Date().toISOString(),
              });
            }
          }
          const filtered = list.filter(
            (i) => !i.isAuto || needsRestock(updated.find((p) => p.id === i.productId) as Product),
          );
          return [...filtered, ...newItems];
        });
        return updated;
      });
    },
    [setAndSaveProducts, setAndSaveList],
  );

  const logRestock = useCallback(
    (productId: string, quantity: number) => {
      const event: UsageEvent = {
        id: generateId(),
        date: new Date().toISOString(),
        quantity,
        type: 'restock',
      };
      setAndSaveProducts((prev) => {
        const updated = prev.map((p) =>
          p.id === productId
            ? {
                ...p,
                currentQuantity: p.currentQuantity + quantity,
                usageHistory: [...p.usageHistory, event],
              }
            : p,
        );
        // Remove auto item if restocked above threshold; re-sync anything still low
        setAndSaveList((list) => {
          const existingAutoIds = new Set(
            list.filter((i) => i.isAuto && i.productId).map((i) => i.productId!),
          );
          const newItems: ShoppingItem[] = [];
          for (const product of updated) {
            if (needsRestock(product) && !existingAutoIds.has(product.id)) {
              newItems.push({
                id: generateId(),
                productId: product.id,
                name: product.name,
                quantity: product.minThreshold > 0 ? product.minThreshold : 1,
                unit: product.unit,
                checked: false,
                isAuto: true,
                addedAt: new Date().toISOString(),
              });
            }
          }
          const filtered = list.filter(
            (i) => !i.isAuto || needsRestock(updated.find((p) => p.id === i.productId) as Product),
          );
          return [...filtered, ...newItems];
        });
        return updated;
      });
    },
    [setAndSaveProducts, setAndSaveList],
  );

  const addShoppingItem = useCallback(
    (item: Omit<ShoppingItem, 'id' | 'addedAt'>) => {
      const newItem: ShoppingItem = {
        ...item,
        id: generateId(),
        addedAt: new Date().toISOString(),
      };
      setAndSaveList((prev) => [...prev, newItem]);
    },
    [setAndSaveList],
  );

  const removeShoppingItem = useCallback(
    (id: string) => {
      setAndSaveList((prev) => prev.filter((i) => i.id !== id));
    },
    [setAndSaveList],
  );

  const toggleShoppingItem = useCallback(
    (id: string) => {
      setAndSaveList((prev) =>
        prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)),
      );
    },
    [setAndSaveList],
  );

  const clearCheckedItems = useCallback(() => {
    setAndSaveList((prev) => prev.filter((i) => !i.checked));
  }, [setAndSaveList]);

  const syncAutoItems = useCallback(() => {
    setAndSaveProducts((prev) => {
      setAndSaveList((list) => {
        const existingAutoProductIds = new Set(
          list.filter((i) => i.isAuto && i.productId).map((i) => i.productId!),
        );
        const newItems: ShoppingItem[] = [];
        for (const product of prev) {
          if (needsRestock(product) && !existingAutoProductIds.has(product.id)) {
            newItems.push({
              id: generateId(),
              productId: product.id,
              name: product.name,
              quantity: product.minThreshold > 0 ? product.minThreshold : 1,
              unit: product.unit,
              checked: false,
              isAuto: true,
              addedAt: new Date().toISOString(),
            });
          }
          // Remove auto items for products that no longer need restock
          if (!needsRestock(product)) {
            // keep only non-auto or other products' auto items
          }
        }
        const filteredList = list.filter(
          (i) => !i.isAuto || needsRestock(prev.find((p) => p.id === i.productId) as Product),
        );
        return [...filteredList, ...newItems];
      });
      return prev;
    });
  }, [setAndSaveProducts, setAndSaveList]);

  const reloadData = useCallback(async () => {
    const [p, s] = await Promise.all([loadProducts(), loadShoppingList()]);
    setProducts(p);
    setShoppingList(s);
    productsRef.current = p;
    shoppingListRef.current = s;
  }, []);

  return (
    <ShoppingContext.Provider
      value={{
        products,
        shoppingList,
        isLoaded,
        addProduct,
        updateProduct,
        deleteProduct,
        getProduct,
        getProductByBarcode,
        logConsumption,
        logRestock,
        addShoppingItem,
        removeShoppingItem,
        toggleShoppingItem,
        clearCheckedItems,
        syncAutoItems,
        reloadData,
      }}
    >
      {children}
    </ShoppingContext.Provider>
  );
}

export function useShopping() {
  const ctx = useContext(ShoppingContext);
  if (!ctx) throw new Error('useShopping must be used inside ShoppingProvider');
  return ctx;
}
