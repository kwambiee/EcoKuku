/**
 * Resolve a product image path to a displayable URL.
 *
 * Images can be stored as:
 *   - Full Cloudinary URLs: "https://res.cloudinary.com/rexhupg4/image/upload/..."
 *   - Legacy local paths:   "/uploads/some-file.jpg"  (served by the admin app)
 *   - Empty / undefined:    show a fallback emoji
 */
export function resolveImageUrl(image: string | undefined | null): string | null {
  if (!image) return null;

  // Already an absolute URL (Cloudinary or any CDN) — use as-is
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }

  // Legacy local upload path — prepend the admin app's public URL
  const adminUrl =
    typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3001')
      : (process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3001');

  return `${adminUrl}${image}`;
}
