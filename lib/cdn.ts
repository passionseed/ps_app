/**
 * CDN URL utilities.
 *
 * Always returns a full CDN URL. Handles three cases:
 * 1. Legacy B2 URL  → replace B2 base with CDN base
 * 2. Path-only      → prepend CDN base
 * 3. Already CDN    → return as-is
 */

const B2_BASE = "https://f005.backblazeb2.com/file/pseed-dev";
const CDN_BASE = "https://cdn.passionseed.org";
const SUPABASE_STORAGE_BASE = "supabase.co/storage/v1/object/public/";

/** True if the string looks like a full HTTP(S) URL. */
function isFullUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

/**
 * Transform any stored URL to a CDN URL.
 * - B2 full URL   → CDN URL
 * - Path-only     → CDN base + path
 * - Already CDN   → return as-is
 */
export function toCdnUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  if (url.startsWith(B2_BASE)) {
    // Legacy B2 URL — replace base
    return url.replace(B2_BASE, CDN_BASE);
  }

  if (url.startsWith(CDN_BASE)) {
    // Already a CDN URL — return as-is
    return url;
  }

  if (isFullUrl(url)) {
    // Some other full URL — return as-is (e.g. Supabase storage URL)
    return url;
  }

  // Path-only — prepend CDN base
  return `${CDN_BASE}/${url.replace(/^\//, "")}`;
}

/**
 * Transform an array of file URLs (e.g., fileUrls field).
 */
export function toCdnUrls(urls: string[] | null | undefined): string[] | null {
  if (!urls) return null;
  return urls.map((url) => toCdnUrl(url) ?? url);
}

/**
 * Strip the base URL from a full URL, returning just the storage path.
 * Used before storing to DB.
 */
export function toStoragePath(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith(CDN_BASE)) {
    return url.replace(CDN_BASE + "/", "");
  }
  if (url.startsWith(B2_BASE)) {
    return url.replace(B2_BASE + "/", "");
  }
  // Already a path, return as-is
  return url;
}

