/** Image URL from lane B's renderer (6.2): `?v=` must equal render_version for the immutable cache. */
export function certificateImageUrl(webBaseUrl: string, publicId: string, format: "story" | "square", version: number): string {
  return `${webBaseUrl.replace(/\/+$/, "")}/c/${publicId}/image/${format}?v=${version}`;
}
