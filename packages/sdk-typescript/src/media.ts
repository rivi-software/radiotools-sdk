/** `thumb`/`display` are width-limited WebP renditions; `card` (16:9) and `square` are focal crops. */
export type PublicMediaVariant = "thumb" | "display" | "card" | "square";

/** Build a public media URL. RadioTools serves the bytes. The SDK does not download them. */
export function publicMediaUrl(
  baseUrl: string,
  mediaResourcePrefix: string,
  versionId: string,
  variant?: PublicMediaVariant,
): string {
  const path = variant
    ? `${mediaResourcePrefix}/${versionId}/${variant}`
    : `${mediaResourcePrefix}/${versionId}`;
  return new URL(path, baseUrl).href;
}
