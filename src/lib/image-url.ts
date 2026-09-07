const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

/** The API origin, without the /api/v1 suffix the client appends to its calls. */
const ORIGIN = API_URL.replace(/\/api\/v1\/?$/, '');

/**
 * Where to actually fetch an item or category picture from.
 *
 * Two kinds of value live in `imageUrl`. A photograph uploaded through Menu
 * management is stored as a path - `/api/v1/public/items/{id}/image` - because
 * an absolute URL baked in at upload time would be the hostname of whichever
 * machine handled it, and wrong the moment this is deployed anywhere. Anything
 * else is an external link and is passed through untouched.
 *
 * Without this the kiosk resolves that path against its own origin and shows a
 * broken image, which is exactly what it did until somebody looked.
 */
export function resolveImageUrl(imageUrl?: string | null): string | undefined {
  if (!imageUrl) return undefined;
  if (imageUrl.startsWith('/')) return `${ORIGIN}${imageUrl}`;
  return imageUrl;
}
