/**
 * The SpaceWatch mark — point of light, rising trail, open halo ring — in the same geometry as
 * the app icons (1536px canvas), always on its own near-black field so it reads identically in
 * light and dark themes.
 */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg class="brand-mark" width={size} height={size} viewBox="330 330 876 876" role="img" aria-label="SpaceWatch">
      <rect x="330" y="330" width="876" height="876" rx="200" fill="#0B0B0D" />
      <line x1="472" y1="1062" x2="954" y2="581" stroke="#575E71" stroke-width="62" stroke-linecap="round" />
      <path d="M831.6 618.4 A128 128 0 1 1 918.7 704" fill="none" stroke="#53586B" stroke-width="14" stroke-linecap="round" />
      <circle cx="954" cy="581" r="70" fill="#F2F1EF" />
    </svg>
  );
}
