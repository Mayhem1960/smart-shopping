import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Deal,
  DEFAULT_PROMOTIONS_SETTINGS,
  fetchLocalDeals,
  findDealForItem,
  loadPromotionsSettings,
  LocationInfo,
  PromotionsSettings,
  resolveCurrentLocation,
  savePromotionsSettings,
} from '@/lib/promotions';

interface PromotionsContextType {
  settings: PromotionsSettings;
  isLoading: boolean;
  /** Call this when user approves location + promotions feature */
  enablePromotions: () => Promise<void>;
  /** Disable and clear promotions */
  disablePromotions: () => void;
  /** Refresh deals against a list of item names */
  refreshDeals: (itemNames: string[]) => Promise<void>;
  /** Find the best deal for a specific item */
  getDeal: (itemName: string) => Deal | undefined;
}

const PromotionsContext = createContext<PromotionsContextType | null>(null);

export function PromotionsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PromotionsSettings>(DEFAULT_PROMOTIONS_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const settingsRef = useRef(settings);

  // Load saved settings on mount
  useEffect(() => {
    loadPromotionsSettings().then((s) => {
      setSettings(s);
      settingsRef.current = s;
    });
  }, []);

  const persist = useCallback((s: PromotionsSettings) => {
    settingsRef.current = s;
    setSettings(s);
    savePromotionsSettings(s);
  }, []);

  const enablePromotions = useCallback(async () => {
    setIsLoading(true);
    try {
      const locationInfo = await resolveCurrentLocation();
      const next: PromotionsSettings = {
        ...settingsRef.current,
        enabled: true,
        locationApproved: true,
        locationInfo: locationInfo ?? undefined,
        lastFetchedAt: undefined,
        deals: [],
      };
      persist(next);
    } finally {
      setIsLoading(false);
    }
  }, [persist]);

  const disablePromotions = useCallback(() => {
    const next: PromotionsSettings = {
      ...DEFAULT_PROMOTIONS_SETTINGS,
      locationApproved: false,
    };
    persist(next);
  }, [persist]);

  const refreshDeals = useCallback(
    async (itemNames: string[]) => {
      const s = settingsRef.current;
      if (!s.enabled || !s.locationInfo) return;
      setIsLoading(true);
      try {
        const deals = await fetchLocalDeals(s.locationInfo, itemNames);
        const next: PromotionsSettings = {
          ...s,
          deals,
          lastFetchedAt: new Date().toISOString(),
        };
        persist(next);
      } finally {
        setIsLoading(false);
      }
    },
    [persist],
  );

  const getDeal = useCallback(
    (itemName: string) => findDealForItem(itemName, settingsRef.current.deals),
    [],
  );

  return (
    <PromotionsContext.Provider
      value={{ settings, isLoading, enablePromotions, disablePromotions, refreshDeals, getDeal }}
    >
      {children}
    </PromotionsContext.Provider>
  );
}

export function usePromotions() {
  const ctx = useContext(PromotionsContext);
  if (!ctx) throw new Error('usePromotions must be used inside PromotionsProvider');
  return ctx;
}
