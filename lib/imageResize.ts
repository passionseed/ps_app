/**
 * Append Supabase image transform params to storage URLs.
 * Non-Supabase URLs are returned unchanged.
 *
 * Supabase transforms: /storage/v1/render/image/public/<bucket>/<path>?width=&height=&quality=
 * Docs: https://supabase.com/docs/guides/storage/serving/image-transformations
 *
 * ⚠️  Requires "Image Transformations" to be enabled in Supabase Dashboard → Storage → Settings.
 *     Set ENABLE_IMAGE_TRANSFORMS = true once confirmed.
 */

/**
 * Flip to `true` after confirming image transforms are enabled on your
 * Supabase project.  While `false`, all helpers return the original URL
 * unchanged — zero risk of broken images.
 */
const ENABLE_IMAGE_TRANSFORMS = false;

const SUPABASE_OBJECT_RE =
  /^(https?:\/\/[^/]+)\/storage\/v1\/object\/public\/(.+)$/;

export interface ResizeOptions {
  width?: number;
  height?: number;
  /** 1-100, default 75 */
  quality?: number;
}

/**
 * Convert a Supabase public object URL to a resized render URL.
 * Returns the original URL unchanged if:
 *  - transforms are disabled (ENABLE_IMAGE_TRANSFORMS = false)
 *  - the URL is not a Supabase storage URL
 *  - the URL is null/undefined
 */
export function resizedUrl(
  url: string | null | undefined,
  opts: ResizeOptions,
): string | null {
  if (!url) return null;
  if (!ENABLE_IMAGE_TRANSFORMS) return url;
  const match = url.match(SUPABASE_OBJECT_RE);
  if (!match) return url;

  const [, origin, objectPath] = match;
  const params = new URLSearchParams();
  if (opts.width) params.set("width", String(opts.width));
  if (opts.height) params.set("height", String(opts.height));
  params.set("quality", String(opts.quality ?? 75));

  return `${origin}/storage/v1/render/image/public/${objectPath}?${params}`;
}

/** Common presets */
export const IMG = {
  /** Chat/comic thumbnails */
  thumb: (url: string | null | undefined) =>
    resizedUrl(url, { width: 480, quality: 70 }),
  /** Comic panel / evidence panel (full-width) */
  panel: (url: string | null | undefined) =>
    resizedUrl(url, { width: 960, quality: 75 }),
  /** Avatar */
  avatar: (url: string | null | undefined) =>
    resizedUrl(url, { width: 96, quality: 70 }),
} as const;
