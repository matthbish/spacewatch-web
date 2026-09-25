import { useEffect, useState } from 'preact/hooks';
import type { FavoriteType } from './domain';
import { FAVORITE_TYPES } from './domain';

/**
 * Hash routes: GitHub Pages has no server-side rewrites, and a hash route survives a reload or a
 * deep link under any base path with no 404.html trick. A future "Satellites" or "ISS" section
 * is one more case here plus one nav entry.
 */
export type Route =
  | { name: 'home' }
  | { name: 'favorites' }
  | { name: 'settings'; section?: 'install' }
  | { name: 'support' }
  | { name: 'launch'; id: string }
  | { name: 'entity'; type: FavoriteType; id: string; label: string }
  | { name: 'notFound' };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map((p) => {
    try { return decodeURIComponent(p); } catch { return p; }
  });
  const [head, a, b, c] = parts;
  if (!head) return { name: 'home' };
  if (parts.length === 1 && (head === 'favorites' || head === 'settings' || head === 'support')) return { name: head };
  if (head === 'settings' && a === 'install' && parts.length === 2) return { name: 'settings', section: 'install' };
  if (head === 'launch' && a && parts.length === 2) return { name: 'launch', id: a };
  if (head === 'entity' && FAVORITE_TYPES.includes(a as FavoriteType) && a !== 'LAUNCH' && b && parts.length <= 4) {
    return { name: 'entity', type: a as FavoriteType, id: b, label: c ?? b };
  }
  return { name: 'notFound' };
}

export const paths = {
  home: '#/',
  favorites: '#/favorites',
  settings: '#/settings',
  install: '#/settings/install',
  support: '#/support',
  launch: (id: string) => `#/launch/${encodeURIComponent(id)}`,
  entity: (type: FavoriteType, id: string, label: string) =>
    `#/entity/${type}/${encodeURIComponent(id)}/${encodeURIComponent(label)}`,
};

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const update = () => setRoute(parseRoute(location.hash));
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return route;
}

let inAppNavigations = 0;
if (typeof window !== 'undefined') window.addEventListener('hashchange', () => { inAppNavigations++; });

/** Back within the app when there's somewhere to go back to; home when opened via a deep link. */
export function goBack() {
  if (inAppNavigations > 0) history.back();
  else location.hash = paths.home;
}
