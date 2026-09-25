import { setState } from './store';

/** Chromium's install prompt event; not in the DOM typings because only Chromium ships it. */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function isInstalled(): boolean {
  return matchMedia('(display-mode: standalone)').matches ||
    matchMedia('(display-mode: minimal-ui)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * Only Chromium browsers let a site trigger installation itself (by holding on to this event);
 * Firefox and every iOS browser install from their own menus, so there we show instructions.
 */
export function startInstallListeners() {
  setState({ installed: isInstalled() }, false);
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    setState({ canPromptInstall: true }, false);
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    setState({ installed: true, canPromptInstall: false }, false);
  });
  matchMedia('(display-mode: standalone)').addEventListener('change', () => setState({ installed: isInstalled() }, false));
}

/** Opens the browser's native install dialog. Returns false when the browser doesn't offer one. */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  const prompt = deferredPrompt;
  deferredPrompt = null;
  setState({ canPromptInstall: false }, false);
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  if (outcome === 'accepted') setState({ installed: true }, false);
  return true;
}

export type InstallPlatform = 'ios' | 'android-firefox' | 'android' | 'mac-safari' | 'desktop-firefox' | 'desktop';

/** Pure, for testing: which set of manual install steps fits this browser. */
export function installPlatform(userAgent: string, platform = '', maxTouchPoints = 0): InstallPlatform {
  const iOS = /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
  if (iOS) return 'ios';
  const firefox = /Firefox\//.test(userAgent);
  if (/Android/.test(userAgent)) return firefox ? 'android-firefox' : 'android';
  if (firefox) return 'desktop-firefox';
  if (/Macintosh/.test(userAgent) && /Safari\//.test(userAgent) && !/Chrome|Chromium|Edg\//.test(userAgent)) return 'mac-safari';
  return 'desktop';
}

export const INSTALL_STEPS: Record<InstallPlatform, string> = {
  ios: 'Tap Share, then Add to Home Screen (iOS 16.4 or later, in Safari, Firefox, or Chrome). On iPhone and iPad, installing is also what lets SpaceWatch send reminder notifications.',
  'android-firefox': 'Tap the ⋮ menu, then Add app to Home screen (Install in some versions).',
  android: 'Open your browser menu (⋮) and tap Install app or Add to Home screen.',
  'mac-safari': 'In the menu bar, choose File, then Add to Dock.',
  'desktop-firefox': "Firefox on desktop doesn't install web apps. Open SpaceWatch in Chrome or Edge and use the install icon in the address bar.",
  desktop: 'Look for the install icon at the right of the address bar, or Install in your browser menu.',
};
