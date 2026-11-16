import { Product } from '../types';

export function slugifyProductName(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getProductSlug(product: Product): string {
  if (product.id && product.id.startsWith('prod-')) {
    return product.id.slice(5);
  }
  const nameSlug = slugifyProductName(product.name || '');
  if (product.id) {
    const cleanId = slugifyProductName(product.id);
    return nameSlug ? `${nameSlug}-${cleanId.slice(-6)}` : cleanId;
  }
  return nameSlug || product.id;
}

export function getProductPath(product: Product): string {
  return `/product/${encodeURIComponent(getProductSlug(product))}`;
}

export function getProductUrl(product: Product): string {
  const path = getProductPath(product);
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
}

export function findProductByIdentifier(
  products: Product[],
  identifier: string
): Product | undefined {
  const clean = decodeURIComponent(identifier || '').trim();
  if (!clean) return undefined;
  const lower = clean.toLowerCase();

  return (
    products.find((p) => p.id === clean || p.id.toLowerCase() === lower) ||
    products.find((p) => p.id.toLowerCase() === `prod-${lower}`) ||
    products.find((p) => getProductSlug(p).toLowerCase() === lower) ||
    products.find((p) => slugifyProductName(p.name) === lower)
  );
}

export async function copyTextSafe(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
