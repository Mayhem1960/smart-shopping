export interface FoodProduct {
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  quantity?: string;
}

/**
 * Open Food Facts stores images at a predictable path derived from the barcode.
 * For 13-digit EAN: /images/products/AAA/BBB/CCC/DDDD/front_en.400.jpg
 * For 8-digit EAN8: /images/products/XXXXXXXX/front_en.400.jpg
 * We try this as a fallback when the API doesn't return an image URL directly.
 */
function buildFallbackImageUrl(barcode: string): string | undefined {
  const clean = barcode.replace(/\D/g, '');
  if (clean.length === 13) {
    const a = clean.slice(0, 3);
    const b = clean.slice(3, 6);
    const c = clean.slice(6, 9);
    const d = clean.slice(9);
    return `https://images.openfoodfacts.org/images/products/${a}/${b}/${c}/${d}/front_en.400.jpg`;
  }
  if (clean.length === 8) {
    return `https://images.openfoodfacts.org/images/products/${clean}/front_en.400.jpg`;
  }
  return undefined;
}

export async function lookupBarcode(barcode: string): Promise<FoodProduct | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`,
      { headers: { 'User-Agent': 'SmartShoppingApp/1.0' } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;

    // Try multiple image fields in order of preference
    const rawImageUrl: string =
      p.image_front_url ||
      p.image_front_small_url ||
      p.image_url ||
      p.selected_images?.front?.display?.en ||
      p.selected_images?.front?.display?.fr ||
      '';

    // Ensure HTTPS and fall back to the constructed URL if nothing found
    let imageUrl: string | undefined;
    if (rawImageUrl) {
      imageUrl = rawImageUrl.replace(/^http:\/\//, 'https://');
    } else {
      imageUrl = buildFallbackImageUrl(barcode);
    }

    return {
      name: p.product_name || p.product_name_en || '',
      brand: p.brands || undefined,
      category: p.categories_tags?.[0]?.replace(/^en:/, '') || undefined,
      imageUrl,
      quantity: p.quantity || undefined,
    };
  } catch {
    return null;
  }
}
