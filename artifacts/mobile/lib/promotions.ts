import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@smartshopping/promotions';

export interface Deal {
  id: string;
  store: string;
  itemName: string;
  price?: string;
  unit?: string;
  validUntil?: string;
}

export interface LocationInfo {
  city: string;
  postalCode: string;
  country: string;
}

export interface PromotionsSettings {
  enabled: boolean;
  locationApproved: boolean;
  locationInfo?: LocationInfo;
  lastFetchedAt?: string;
  deals: Deal[];
}

export const DEFAULT_PROMOTIONS_SETTINGS: PromotionsSettings = {
  enabled: false,
  locationApproved: false,
  deals: [],
};

export async function loadPromotionsSettings(): Promise<PromotionsSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_PROMOTIONS_SETTINGS, ...JSON.parse(raw) } : DEFAULT_PROMOTIONS_SETTINGS;
  } catch {
    return DEFAULT_PROMOTIONS_SETTINGS;
  }
}

export async function savePromotionsSettings(settings: PromotionsSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/** Request location permission and reverse-geocode to city info */
export async function resolveCurrentLocation(): Promise<LocationInfo | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const [geo] = await Location.reverseGeocodeAsync({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });
    if (!geo) return null;

    return {
      city: geo.city || geo.district || geo.subregion || '',
      postalCode: geo.postalCode || '',
      country: geo.isoCountryCode || geo.country || '',
    };
  } catch {
    return null;
  }
}

/**
 * Try to fetch local supermarket deals for the given item names.
 * Uses the Flipp public catalog API for NA and some EU markets.
 * Falls back gracefully for unsupported regions.
 */
export async function fetchLocalDeals(
  locationInfo: LocationInfo,
  itemNames: string[],
): Promise<Deal[]> {
  const deals: Deal[] = [];
  // Limit searches to avoid too many requests
  const names = [...new Set(itemNames)].slice(0, 8);

  const localeMap: Record<string, string> = {
    CA: 'en-ca',
    US: 'en-us',
    GB: 'en-gb',
    AU: 'en-au',
  };
  const locale = localeMap[locationInfo.country] || 'en-us';
  const postal = locationInfo.postalCode || locationInfo.city;

  await Promise.allSettled(
    names.map(async (name) => {
      try {
        const url = `https://backflipp.wishabi.com/flipp/items/search?locale=${locale}&postal_code=${encodeURIComponent(postal)}&q=${encodeURIComponent(name)}`;
        const resp = await fetch(url, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(6000),
        });
        if (!resp.ok) return;
        const data = await resp.json();
        const items: any[] = data?.items ?? [];
        for (const item of items.slice(0, 2)) {
          const store = item.merchant || item.flyer_type || 'Local Store';
          const price = item.current_price
            ? `${item.current_price}`
            : item.sale_story || undefined;
          deals.push({
            id: String(item.id ?? `${name}-${Math.random()}`),
            store,
            itemName: item.name || name,
            price,
            unit: item.sale_description || undefined,
            validUntil: item.valid_to
              ? new Date(item.valid_to * 1000).toLocaleDateString()
              : undefined,
          });
        }
      } catch {
        // silently skip failures for individual items
      }
    }),
  );

  return deals;
}

/** Return the best matching deal for a shopping list item name */
export function findDealForItem(itemName: string, deals: Deal[]): Deal | undefined {
  const needle = itemName.toLowerCase().trim();
  // Exact or contains match
  const exact = deals.find((d) => d.itemName.toLowerCase().includes(needle));
  if (exact) return exact;
  // Partial word match (first word of item vs deal)
  const firstWord = needle.split(' ')[0];
  if (firstWord.length > 3) {
    return deals.find((d) => d.itemName.toLowerCase().includes(firstWord));
  }
  return undefined;
}
