import { useState } from 'preact/hooks';

/**
 * The launch photo at the top of a detail page. Dimmed and faded into the page background so it
 * sets the scene without glaring; if it's missing or fails to load (offline, dead link), it simply
 * isn't there and the page reads exactly as it did without photos.
 */
export function LaunchImage({ src, alt, credit, license }: {
  src: string | null;
  alt: string;
  credit: string | null;
  license: string | null;
}) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');
  // Reset during render, not in an effect: a mount effect can run after a fast onLoad and undo it.
  const [shownSrc, setShownSrc] = useState(src);
  if (src !== shownSrc) {
    setShownSrc(src);
    setStatus('loading');
  }
  if (!src || status === 'failed') return null;
  return (
    <figure class={`launch-image${status === 'loaded' ? ' is-loaded' : ''}`} data-testid="launch-image">
      <img
        src={src}
        alt={alt}
        decoding="async"
        referrerpolicy="no-referrer"
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('failed')}
      />
      <figcaption>
        {credit ? `Image: ${credit}` : 'Image via The Space Devs'}
        {license && ` · ${license}`}
      </figcaption>
    </figure>
  );
}
