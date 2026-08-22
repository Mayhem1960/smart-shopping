export interface FoodProduct {
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  quantity?: string;
}

// Bound every source so one slow/hanging database can't stall the whole lookup.
const LOOKUP_TIMEOUT_MS = 6000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function httpsUrl(url: string): string {
  return url.replace(/^http:\/\//, 'https://');
}

function buildOffImageUrl(barcode: string): string | undefined {
  const clean = barcode.replace(/\D/g, '');
  if (clean.length === 13) {
    const [a, b, c, d] = [clean.slice(0, 3), clean.slice(3, 6), clean.slice(6, 9), clean.slice(9)];
    return `https://images.openfoodfacts.org/images/products/${a}/${b}/${c}/${d}/front_en.400.jpg`;
  }
  if (clean.length === 8) {
    return `https://images.openfoodfacts.org/images/products/${clean}/front_en.400.jpg`;
  }
  return undefined;
}

function titleCase(s: string): string {
  if (!s) return s;
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Score a result by how many useful fields it has (higher = more complete). */
function score(p: FoodProduct): number {
  return (
    (p.name ? 3 : 0) +
    (p.brand ? 2 : 0) +
    (p.category ? 1 : 0) +
    (p.imageUrl ? 1 : 0) +
    (p.quantity ? 1 : 0)
  );
}

function isUsable(p: FoodProduct | null): p is FoodProduct {
  return !!(p && p.name && p.name.trim().length > 0);
}

/**
 * Normalise barcodes so all lookups work on the canonical form.
 * UPC-A (12 digits) → EAN-13 (prepend "0")
 * EAN-13 starting with "0" → also try UPC-A (strip leading zero)
 */
function normaliseBarcodes(barcode: string): string[] {
  const clean = barcode.replace(/\D/g, '');
  const variants = new Set<string>([clean]);
  if (clean.length === 12) {
    variants.add('0' + clean); // UPC-A → EAN-13
  }
  if (clean.length === 13 && clean.startsWith('0')) {
    variants.add(clean.slice(1)); // EAN-13 → UPC-A
  }
  return Array.from(variants);
}

// ---------------------------------------------------------------------------
// Source 1 – Open Food Facts  (food & beverages — worldwide)
// ---------------------------------------------------------------------------
async function lookupOpenFoodFacts(barcode: string): Promise<FoodProduct | null> {
  try {
    // Try both the canonical barcode AND converted form
    const codes = normaliseBarcodes(barcode);
    for (const code of codes) {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}?fields=product_name,product_name_en,brands,categories_tags,image_front_url,image_front_small_url,image_url,selected_images,quantity`,
        { headers: { 'User-Agent': 'SmartShoppingApp/1.0' }, signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) },
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status !== 1 || !data.product) continue;
      const p = data.product;

      const rawImg: string =
        p.image_front_url || p.image_front_small_url || p.image_url ||
        p.selected_images?.front?.display?.en || p.selected_images?.front?.display?.fr || '';

      const imageUrl = rawImg ? httpsUrl(rawImg) : buildOffImageUrl(code);
      const name = p.product_name_en || p.product_name || '';
      const brand = p.brands?.split(',')[0].trim() || '';
      const category = p.categories_tags?.find((t: string) => t.startsWith('en:'))?.replace(/^en:/, '') || '';

      if (!name) continue;
      return { name: titleCase(name), brand: titleCase(brand), category, imageUrl, quantity: p.quantity };
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Source 2 – UPC Item DB  (general retail — free trial, no key)
// ---------------------------------------------------------------------------
async function lookupUpcItemDb(barcode: string): Promise<FoodProduct | null> {
  try {
    const codes = normaliseBarcodes(barcode);
    for (const code of codes) {
      const res = await fetch(
        `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`,
        { headers: { 'User-Agent': 'SmartShoppingApp/1.0', Accept: 'application/json' }, signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) },
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.code !== 'OK' || !data.items?.length) continue;
      const item = data.items[0];
      const name = item.title || '';
      if (!name) continue;
      return {
        name: titleCase(name),
        brand: titleCase(item.brand || ''),
        category: titleCase(item.category || ''),
        imageUrl: item.images?.[0] ? httpsUrl(item.images[0]) : undefined,
        quantity: item.size || undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Source 3 – Open Beauty Facts  (cosmetics / personal care)
// ---------------------------------------------------------------------------
async function lookupOpenBeautyFacts(barcode: string): Promise<FoodProduct | null> {
  try {
    const codes = normaliseBarcodes(barcode);
    for (const code of codes) {
      const res = await fetch(
        `https://world.openbeautyfacts.org/api/v0/product/${encodeURIComponent(code)}.json`,
        { headers: { 'User-Agent': 'SmartShoppingApp/1.0' }, signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) },
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status !== 1 || !data.product) continue;
      const p = data.product;
      const name = p.product_name_en || p.product_name || '';
      if (!name) continue;
      const rawImg = p.image_front_url || p.image_url || '';
      return {
        name: titleCase(name),
        brand: titleCase(p.brands?.split(',')[0].trim() || ''),
        category: 'Personal Care',
        imageUrl: rawImg ? httpsUrl(rawImg) : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Source 4 – Open Products Facts  (household / non-food / non-beauty)
// ---------------------------------------------------------------------------
async function lookupOpenProductsFacts(barcode: string): Promise<FoodProduct | null> {
  try {
    const codes = normaliseBarcodes(barcode);
    for (const code of codes) {
      const res = await fetch(
        `https://world.openproductsfacts.org/api/v0/product/${encodeURIComponent(code)}.json`,
        { headers: { 'User-Agent': 'SmartShoppingApp/1.0' }, signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) },
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status !== 1 || !data.product) continue;
      const p = data.product;
      const name = p.product_name_en || p.product_name || '';
      if (!name) continue;
      const rawImg = p.image_front_url || p.image_url || '';
      return {
        name: titleCase(name),
        brand: titleCase(p.brands?.split(',')[0].trim() || ''),
        imageUrl: rawImg ? httpsUrl(rawImg) : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Source 5 – Datakick  (open crowd-sourced product database)
// ---------------------------------------------------------------------------
async function lookupDatakick(barcode: string): Promise<FoodProduct | null> {
  try {
    const codes = normaliseBarcodes(barcode);
    for (const code of codes) {
      const res = await fetch(
        `https://www.datakick.org/api/items/${encodeURIComponent(code)}`,
        { headers: { 'User-Agent': 'SmartShoppingApp/1.0', Accept: 'application/json' }, signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) },
      );
      if (!res.ok) continue;
      const data = await res.json();
      const name = data.name || '';
      if (!name) continue;
      return {
        name: titleCase(name),
        brand: data.brand_name ? titleCase(data.brand_name) : undefined,
        imageUrl: data.images?.[0]?.url ? httpsUrl(data.images[0].url) : undefined,
        quantity: data.size ? `${data.size}${data.unit || ''}` : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Source 6 – Open Food Facts US (direct subdomain — better NA coverage)
// ---------------------------------------------------------------------------
async function lookupOpenFoodFactsUS(barcode: string): Promise<FoodProduct | null> {
  try {
    const codes = normaliseBarcodes(barcode);
    for (const code of codes) {
      const res = await fetch(
        `https://us.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`,
        { headers: { 'User-Agent': 'SmartShoppingApp/1.0' }, signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) },
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status !== 1 || !data.product) continue;
      const p = data.product;
      const name = p.product_name_en || p.product_name || '';
      if (!name) continue;
      const rawImg = p.image_front_url || p.image_front_small_url || p.image_url || '';
      return {
        name: titleCase(name),
        brand: titleCase(p.brands?.split(',')[0].trim() || ''),
        category: p.categories_tags?.[0]?.replace(/^en:/, '') || undefined,
        imageUrl: rawImg ? httpsUrl(rawImg) : buildOffImageUrl(code),
        quantity: p.quantity || undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main export
// Runs ALL sources in parallel, then returns the result with the highest
// completeness score (most fields filled) rather than just the first hit.
// ---------------------------------------------------------------------------
export async function lookupBarcode(barcode: string): Promise<FoodProduct | null> {
  const results = await Promise.allSettled([
    lookupOpenFoodFacts(barcode),
    lookupUpcItemDb(barcode),
    lookupOpenFoodFactsUS(barcode),
    lookupOpenBeautyFacts(barcode),
    lookupOpenProductsFacts(barcode),
    lookupDatakick(barcode),
  ]);

  const usable = results
    .filter((r): r is PromiseFulfilledResult<FoodProduct | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter(isUsable);

  if (usable.length === 0) return null;

  // Return the most complete result
  return usable.reduce((best, current) => (score(current) > score(best) ? current : best));
}
