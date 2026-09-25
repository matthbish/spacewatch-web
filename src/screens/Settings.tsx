import type { ComponentChildren } from 'preact';
import { PageHeader } from '../components/PageHeader';
import { SupportLink } from '../components/SupportLink';
import { APP_VERSION, CACHE_TTL_HOURS, REPO_URL } from '../config';
import { formatLastUpdated } from '../domain';
import { needsHomeScreenInstall, requestPermission, usePermission } from '../notifications';
import { type Settings, type ThemeMode, refresh, showToast, updateSettings, useStore } from '../store';

function Toggle({ id, title, subtitle, checked, onChange, nested = false }: {
  id: string;
  title: string;
  subtitle?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  nested?: boolean;
}) {
  return (
    <div class={`setting-row${nested ? ' setting-row--nested' : ''}`}>
      <label for={id} class="setting-row__text">
        <span>{title}</span>
        {subtitle && <small id={`${id}-desc`}>{subtitle}</small>}
      </label>
      <input
        id={id}
        type="checkbox"
        role="switch"
        class="switch"
        checked={checked}
        aria-describedby={subtitle ? `${id}-desc` : undefined}
        onChange={(e) => onChange(e.currentTarget.checked)}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ComponentChildren }) {
  const id = `settings-${title.toLowerCase()}`;
  return (
    <section class="settings-section" aria-labelledby={id}>
      <h2 class="settings-section__title" id={id}>{title}</h2>
      {children}
    </section>
  );
}

function PermissionNotice({ enabled }: { enabled: boolean }) {
  const permission = usePermission();
  if (!enabled) return null;
  if (permission === 'unsupported') {
    return (
      <p class="notice" data-testid="permission-notice" data-permission="unsupported">
        {needsHomeScreenInstall()
          ? 'On iPhone and iPad, notifications work once SpaceWatch is added to your Home Screen (Share → Add to Home Screen).'
          : "This browser doesn't support notifications. Favorites still work — you just won't get reminders here."}
      </p>
    );
  }
  if (permission === 'denied') {
    return (
      <p class="notice" data-testid="permission-notice" data-permission="denied">
        Notifications are blocked for this site. Allow them in your browser's site settings to get launch reminders.
      </p>
    );
  }
  if (permission === 'default') {
    return (
      <div class="notice notice--action" data-testid="permission-notice" data-permission="default">
        <p>Your browser needs permission before SpaceWatch can send reminders.</p>
        <button type="button" class="button button--tonal" onClick={() => void requestPermission()}>Allow notifications</button>
      </div>
    );
  }
  return null;
}

const THEMES: [ThemeMode, string][] = [['SYSTEM', 'System'], ['LIGHT', 'Light'], ['DARK', 'Dark']];

export function SettingsScreen() {
  const settings = useStore((s) => s.settings);
  const lastRefresh = useStore((s) => s.lastRefresh);
  const refreshing = useStore((s) => s.refreshing);
  const set = (patch: Partial<Settings>) => updateSettings(patch);

  const refreshNow = async () => {
    const result = await refresh(true);
    showToast(
      result.kind === 'success' ? 'Launch data updated'
        : result.kind === 'offline' ? "You're offline — showing previously saved data"
          : 'Refresh failed — showing previously saved data',
    );
  };

  return (
    <>
      <PageHeader title="Settings" center />
      <div class="settings">
        <Section title="Notifications">
          <Toggle
            id="notifications-enabled"
            title="Launch notifications"
            subtitle="Get notified before your favorited launches"
            checked={settings.notificationsEnabled}
            onChange={(enabled) => {
              set({ notificationsEnabled: enabled });
              if (enabled) void requestPermission();
            }}
          />
          <PermissionNotice enabled={settings.notificationsEnabled} />
          {settings.notificationsEnabled && (
            <>
              <Toggle nested id="notify-24h" title="Notify 24 hours before" checked={settings.notify24h} onChange={(v) => set({ notify24h: v })} />
              <Toggle nested id="notify-1h" title="Notify 1 hour before" checked={settings.notify1h} onChange={(v) => set({ notify1h: v })} />
              <Toggle
                nested
                id="notify-new"
                title="New launches for your favorites"
                subtitle="Notify when a new launch is added for a favorited rocket, provider, launch site, or region"
                checked={settings.notifyNewFavoriteMatches}
                onChange={(v) => set({ notifyNewFavoriteMatches: v })}
              />
              <p class="hint" data-testid="notification-limitation">
                Browsers only deliver SpaceWatch reminders while it's open in a tab or running as an installed
                app — websites can't schedule notifications while fully closed.
              </p>
            </>
          )}
        </Section>

        <Section title="Appearance">
          <fieldset class="radio-group">
            <legend>Theme</legend>
            {THEMES.map(([mode, label]) => (
              <label key={mode} class="radio-row">
                <input type="radio" name="theme" value={mode} checked={settings.theme === mode} onChange={() => set({ theme: mode })} />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
        </Section>

        <Section title="Data">
          <div class="setting-row">
            <div class="setting-row__text">
              <span>Refresh launch data</span>
              <small>{lastRefresh ? `Last updated ${formatLastUpdated(lastRefresh)}` : 'Not yet updated'}</small>
            </div>
            <button type="button" class="text-button" disabled={refreshing} onClick={() => void refreshNow()}>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          <p class="hint">Cached data is refreshed automatically every {CACHE_TTL_HOURS} hours.</p>
        </Section>

        <Section title="About">
          <dl class="about">
            <div class="about__row"><dt>Version</dt><dd>{APP_VERSION}</dd></div>
            <div class="about__row about__row--stacked">
              <dt>Data source</dt>
              <dd>Launch data provided by <a href="https://thespacedevs.com/llapi" target="_blank" rel="noopener noreferrer">The Space Devs — Launch Library 2</a></dd>
            </div>
            <div class="about__row about__row--stacked">
              <dt>Source code</dt>
              <dd>SpaceWatch is open source (MIT). <a href={REPO_URL} target="_blank" rel="noopener noreferrer">View it on GitHub</a></dd>
            </div>
          </dl>
          <h3 class="about__privacy-title">Privacy</h3>
          <p class="hint">
            SpaceWatch stores everything — favorites, settings, and cached launches — locally in your browser on this
            device. It does not collect personal information, does not use analytics or tracking, and does not require
            an account. The only network requests it makes are to fetch public launch schedule data.
          </p>
          <div class="settings__support"><SupportLink /></div>
        </Section>
      </div>
    </>
  );
}
