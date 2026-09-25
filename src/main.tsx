import { render } from 'preact';
import { App } from './app';
import { startInstallListeners } from './install';
import { notifyNewLaunches, startReminderLoop } from './notifications';
import { refresh, setNewLaunchHandler, startStoreListeners } from './store';
import './styles.css';

setNewLaunchHandler(notifyNewLaunches);
startStoreListeners();
startReminderLoop();
startInstallListeners();
void refresh();

render(<App />, document.getElementById('app')!);

/**
 * iOS Safari reports the home-indicator inset even while its bottom toolbar is showing, when the
 * page doesn't actually reach the screen edge — padding the nav bar by it then looks too tall
 * until a scroll collapses the toolbar. The toolbar is showing exactly when the viewport is
 * shorter than its largest size (100lvh); an installed app is always full height.
 */
function syncBrowserToolbar() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100lvh;visibility:hidden;pointer-events:none';
  document.body.append(probe);
  const sync = () => document.documentElement.classList.toggle('browser-toolbar', innerHeight < probe.offsetHeight - 1);
  sync();
  window.addEventListener('resize', sync);
  window.visualViewport?.addEventListener('resize', sync);
}
syncBrowserToolbar();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // No SW (e.g. private mode): the app still works online, it just isn't installable/offline.
    });
  });
}

// Coming back to a tab that sat in the background: pick up anything that went stale meanwhile.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void refresh();
});
