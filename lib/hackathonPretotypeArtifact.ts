const IMAGE_EXTENSION_RE = /\.(jpg|jpeg|png|webp|gif|heic)(?:[?#].*)?$/i;
const RENDERABLE_IMAGE_SCHEME_RE = /^(https?:|file:|content:|data:image\/|blob:)/i;

export function isPretotypeImageUri(value: string | null | undefined): boolean {
  const uri = value?.trim();
  if (!uri) return false;
  if (uri.startsWith("blob:")) return true;
  return RENDERABLE_IMAGE_SCHEME_RE.test(uri) && IMAGE_EXTENSION_RE.test(uri);
}

export function getPretotypeArtifactImageUri(value: string | null | undefined): string | null {
  const uri = value?.trim();
  return uri && isPretotypeImageUri(uri) ? uri : null;
}
