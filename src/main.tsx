import { render } from 'preact';
import { App } from './app';
import { notifyNewLaunches, startReminderLoop } from './notifications';
import { refresh, setNewLaunchHandler, startStoreListeners } from './store';
import './styles.css';

setNewLaunchHandler(notifyNewLaunches);
startStoreListeners();
startReminderLoop();
void refresh();

render(<App />, document.getElementById('app')!);

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
