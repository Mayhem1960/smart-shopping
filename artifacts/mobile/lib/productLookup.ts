export interface FoodProduct {
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  quantity?: string;
}

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

function isUsable(p: FoodProduct): boolean {
  return !!(p.name && p.name.trim().length > 0);
}

// ---------------------------------------------------------------------------
// Source 1 – Open Food Facts  (food & beverages)
// ---------------------------------------------------------------------------
async function lookupOpenFoodFacts(barcode: string): Promise<FoodProduct | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`,
      { headers: { 'User-Agent': 'SmartShoppingApp/1.0' } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;

    const rawImg: string =
      p.image_front_url || p.image_front_small_url || p.image_url ||
      p.selected_images?.front?.display?.en || p.selected_images?.front?.display?.fr || '';

    const imageUrl = rawImg ? httpsUrl(rawImg) : buildOffImageUrl(barcode);

    const name = p.product_name_en || p.product_name || '';
    const brand = p.brands?.split(',')[0].trim() || '';
    const category = p.categories_tags?.[0]?.replace(/^en:/, '') || '';

    if (!name) return null;
    return { name: titleCase(name), brand: titleCase(brand), category, imageUrl };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Source 2 – Open Beauty Facts  (cosmetics / personal care)
// ---------------------------------------------------------------------------
async function lookupOpenBeautyFacts(barcode: string): Promise<FoodProduct | null> {
  try {
    const res = await fetch(
      `https://world.openbeautyfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`,
      { headers: { 'User-Agent': 'SmartShoppingApp/1.0' } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;

    const rawImg = p.image_front_url || p.image_url || '';
    const imageUrl = rawImg ? httpsUrl(rawImg) : undefined;

    const name = p.product_name_en || p.product_name || '';
    const brand = p.brands?.split(',')[0].trim() || '';
    if (!name) return null;
    return { name: titleCase(name), brand: titleCase(brand), category: 'Personal Care', imageUrl };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Source 3 – Open Products Facts  (non-food, non-beauty)
// ---------------------------------------------------------------------------
async function lookupOpenProductsFacts(barcode: string): Promise<FoodProduct | null> {
  try {
    const res = await fetch(
      `https://world.openproductsfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`,
      { headers: { 'User-Agent': 'SmartShoppingApp/1.0' } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;

    const rawImg = p.image_front_url || p.image_url || '';
    const imageUrl = rawImg ? httpsUrl(rawImg) : undefined;

    const name = p.product_name_en || p.product_name || '';
    const brand = p.brands?.split(',')[0].trim() || '';
    if (!name) return null;
    return { name: titleCase(name), brand: titleCase(brand), imageUrl };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Source 4 – UPC Item DB  (general retail – free trial, no key needed)
// ---------------------------------------------------------------------------
async function lookupUpcItemDb(barcode: string): Promise<FoodProduct | null> {
  try {
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`,
      { headers: { 'User-Agent': 'SmartShoppingApp/1.0', Accept: 'application/json' } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== 'OK' || !data.items?.length) return null;
    const item = data.items[0];

    const name = item.title || '';
    const brand = item.brand || '';
    const imageUrl: string | undefined = item.images?.[0] || undefined;
    const category = item.category || '';

    if (!name) return null;
    return {
      name: titleCase(name),
      brand: titleCase(brand),
      category: titleCase(category),
      imageUrl: imageUrl ? httpsUrl(imageUrl) : undefined,
      quantity: item.size || undefined,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Source 5 – Go-UPC  (free public endpoint, good North-American coverage)
// ---------------------------------------------------------------------------
async function lookupGoUpc(barcode: string): Promise<FoodProduct | null> {
  try {
    const res = await fetch(
      `https://go-upc.com/api/v1/code/${encodeURIComponent(barcode)}`,
      { headers: { 'User-Agent': 'SmartShoppingApp/1.0', Accept: 'application/json' } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const prod = data.product;
    if (!prod?.name) return null;

    return {
      name: titleCase(prod.name),
      brand: prod.brand ? titleCase(prod.brand) : undefined,
      category: prod.category || undefined,
      imageUrl: prod.imageUrl ? httpsUrl(prod.imageUrl) : undefined,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main export – tries sources in priority order, returns first usable result
// ---------------------------------------------------------------------------
export async function lookupBarcode(barcode: string): Promise<FoodProduct | null> {
  // Run the two most-coverage sources concurrently first
  const [off, upcdb] = await Promise.all([
    lookupOpenFoodFacts(barcode),
    lookupUpcItemDb(barcode),
  ]);

  if (off && isUsable(off)) return off;
  if (upcdb && isUsable(upcdb)) return upcdb;

  // Fallback chain — beauty, products, go-upc
  const beauty = await lookupOpenBeautyFacts(barcode);
  if (beauty && isUsable(beauty)) return beauty;

  const products = await lookupOpenProductsFacts(barcode);
  if (products && isUsable(products)) return products;

  const goUpc = await lookupGoUpc(barcode);
  if (goUpc && isUsable(goUpc)) return goUpc;

  return null;
}
