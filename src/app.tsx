import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import { BrandMark } from './components/BrandMark';
import { SupportLink } from './components/SupportLink';
import { Toast } from './components/Toast';
import { Icon, type IconName } from './icons';
import { type Route, paths, useRoute } from './router';
import { DetailScreen } from './screens/Detail';
import { EntityLaunchesScreen } from './screens/EntityLaunches';
import { FavoritesScreen } from './screens/Favorites';
import { HomeScreen } from './screens/Home';
import { SettingsScreen } from './screens/Settings';
import { SupportScreen } from './screens/Support';
import { MessageState } from './components/MessageState';
import { type ThemeMode, useStore } from './store';

// Top-level sections. A future "Satellites" or "ISS" is one more entry here plus a route.
const NAV: { route: Route['name']; href: string; label: string; icon: IconName }[] = [
  { route: 'home', href: paths.home, label: 'Launches', icon: 'rocketLaunch' },
  { route: 'favorites', href: paths.favorites, label: 'Favorites', icon: 'star' },
  { route: 'settings', href: paths.settings, label: 'Settings', icon: 'settings' },
];

const TOP_LEVEL = new Set<Route['name']>(['home', 'favorites', 'settings']);

function screenFor(route: Route) {
  switch (route.name) {
    case 'home': return <HomeScreen />;
    case 'favorites': return <FavoritesScreen />;
    case 'settings': return <SettingsScreen />;
    case 'support': return <SupportScreen />;
    case 'launch': return <DetailScreen id={route.id} />;
    case 'entity': return <EntityLaunchesScreen type={route.type} id={route.id} label={route.label} />;
    case 'notFound': return (
      <MessageState icon="explore" title="Nothing here" body="That page doesn't exist.">
        <a class="button" href={paths.home}>See upcoming launches</a>
      </MessageState>
    );
  }
}

const THEME_COLORS = { light: '#F4F3F1', dark: '#0B0B0D' };

export function useTheme(mode: ThemeMode) {
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = mode === 'DARK' || (mode === 'SYSTEM' && media.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? THEME_COLORS.dark : THEME_COLORS.light);
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [mode]);
}

export function App() {
  const route = useRoute();
  const theme = useStore((s) => s.settings.theme);
  const mainRef = useRef<HTMLElement>(null);
  const scrollPositions = useRef(new Map<string, number>());
  const lastHash = useRef(location.hash);
  const firstRender = useRef(true);
  useTheme(theme);

  // Remember scroll per route so Back returns to the same spot in the list.
  useEffect(() => {
    history.scrollRestoration = 'manual';
    const save = () => scrollPositions.current.set(lastHash.current, scrollY);
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, []);

  useLayoutEffect(() => {
    lastHash.current = location.hash;
    window.scrollTo(0, scrollPositions.current.get(location.hash) ?? 0);
    const heading = mainRef.current?.querySelector<HTMLElement>('h1');
    document.title = route.name === 'home' || !heading?.textContent ? 'SpaceWatch — upcoming rocket launches' : `${heading.textContent} · SpaceWatch`;
    // Move focus to the new page's heading for screen-reader and keyboard users, but not on
    // first load, where it would just hijack the browser's own initial focus.
    if (!firstRender.current) heading?.focus({ preventScroll: true });
    firstRender.current = false;
  }, [route]);

  const active = route.name;
  return (
    <div class={`app${TOP_LEVEL.has(active) ? ' is-top-level' : ''}`}>
      <nav class="nav" aria-label="Primary">
        <a class="nav__brand" href={paths.home} aria-label="SpaceWatch home">
          <BrandMark size={40} />
        </a>
        <ul class="nav__items">
          {NAV.map((item) => (
            <li key={item.route}>
              <a class="nav__item" href={item.href} aria-current={active === item.route ? 'page' : undefined}>
                <span class="nav__indicator"><Icon name={item.icon} /></span>
                <span class="nav__label">{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
        <div class="nav__support"><SupportLink compact current={active === 'support'} /></div>
      </nav>
      <main id="main" ref={mainRef} class="main" key={location.hash}>
        {screenFor(route)}
        {active !== 'support' && <footer class="page-footer"><SupportLink /></footer>}
      </main>
      <Toast />
    </div>
  );
}
