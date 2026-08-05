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
  updateShoppingItem: (id: string, updates: Partial<Pick<ShoppingItem, 'quantity' | 'unit' | 'name'>>) => void;
  removeShoppingItem: (id: string) => void;
  toggleShoppingItem: (id: string) => void;
  /** Promote a Smart Suggestion (auto item) into My List as an active, purchasable item */
  addSuggestionToList: (id: string) => void;
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
            // Dedupe against ALL items referencing a product (auto or promoted/manual)
        // so a suggestion the user added to My List isn't re-suggested as a duplicate.
        list.filter((i) => i.productId).map((i) => i.productId!),
          );
          const newItems: ShoppingItem[] = [];
          for (const product of updated) {
            if (needsRestock(product) && !existingAutoIds.has(product.id)) {
              newItems.push({
                id: generateId(),
                productId: product.id,
                name: product.name,
                quantity: 1,
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
            // Dedupe against ALL items referencing a product (auto or promoted/manual)
        // so a suggestion the user added to My List isn't re-suggested as a duplicate.
        list.filter((i) => i.productId).map((i) => i.productId!),
          );
          const newItems: ShoppingItem[] = [];
          for (const product of updated) {
            if (needsRestock(product) && !existingAutoIds.has(product.id)) {
              newItems.push({
                id: generateId(),
                productId: product.id,
                name: product.name,
                quantity: 1,
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

  const addSuggestionToList = useCallback(
    (id: string) => {
      // Convert an auto suggestion into a confirmed My List item: keep it active
      // (unchecked) and drop the auto flag so it reads as a normal, purchasable item.
      setAndSaveList((prev) =>
        prev.map((i) => (i.id === id ? { ...i, isAuto: false, checked: false } : i)),
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
          // Dedupe against ALL items referencing a product (auto or promoted/manual)
        // so a suggestion the user added to My List isn't re-suggested as a duplicate.
        list.filter((i) => i.productId).map((i) => i.productId!),
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

  const updateShoppingItem = useCallback(
    (id: string, updates: Partial<Pick<ShoppingItem, 'quantity' | 'unit' | 'name'>>) => {
      setAndSaveList((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
    },
    [setAndSaveList],
  );

  const reloadData = useCallback(async () => {
    const [p, s] = await Promise.all([loadProducts(), loadShoppingList()]);
    setProducts(p);
    setShoppingList(s);
    productsRef.current = p;
    shoppingListRef.current = s;
  }, []);

  // Keep Smart Suggestions reactive: re-sync whenever product stock/thresholds change
  // (so suggestions refresh automatically) or when the set of product-linked non-auto
  // items changes (so deleting a promoted item re-surfaces it as a suggestion).
  // syncAutoItems only ever touches auto items, so this converges without looping.
  const stockSig = products.map((p) => `${p.id}:${p.currentQuantity}:${p.minThreshold}`).join('|');
  const linkedSig = shoppingList.filter((i) => !i.isAuto).map((i) => i.productId ?? '').join(',');
  useEffect(() => {
    if (!isLoaded) return;
    syncAutoItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, stockSig, linkedSig]);

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
        addSuggestionToList,
        clearCheckedItems,
        syncAutoItems,
        updateShoppingItem,
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
