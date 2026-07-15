export interface FoodProduct {
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  quantity?: string;
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
    return {
      name: p.product_name || p.product_name_en || '',
      brand: p.brands || undefined,
      category: p.categories_tags?.[0]?.replace(/^en:/, '') || undefined,
      imageUrl: p.image_front_url || p.image_url || undefined,
      quantity: p.quantity || undefined,
    };
  } catch {
    return null;
  }
}
