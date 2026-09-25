import { useState } from 'preact/hooks';
import { DataStatusBanner } from '../components/DataStatusBanner';
import { LaunchCard } from '../components/LaunchCard';
import { LaunchListSkeleton } from '../components/LaunchListSkeleton';
import { MessageState } from '../components/MessageState';
import { PageHeader } from '../components/PageHeader';
import {
  computeDataStatus, formatLastUpdated, recentlyLaunched, timelineLaunches, upcomingOnly,
} from '../domain';
import { Icon } from '../icons';
import { requestPermissionForFavorite } from '../notifications';
import { isCacheStale, isFavorite, refresh, setFavorite, useNow, useStore } from '../store';

export function HomeScreen() {
  const s = useStore((x) => x);
  const now = useNow();
  // User-initiated and not persisted: resets to hidden each time Home opens, like on Android.
  const [showRecent, setShowRecent] = useState(false);

  const upcoming = upcomingOnly(s.launches, now);
  const recent = recentlyLaunched(s.launches, now);
  const shown = timelineLaunches(upcoming, recent, showRecent && recent.length > 0);
  const noCache = s.launches.length === 0;
  const loading = noCache && (s.refreshing || s.lastResult === null);
  const hardError = noCache && !s.refreshing && (s.lastResult?.kind === 'failed' || s.lastResult?.kind === 'offline');
  const status = computeDataStatus(s.online, isCacheStale(s, now), s.lastResult?.kind === 'failed');

  return (
    <>
      <PageHeader title="SpaceWatch" center>
        {recent.length > 0 && (
          <button
            type="button"
            class={`icon-button${showRecent ? ' is-active' : ''}`}
            aria-pressed={showRecent}
            aria-label={showRecent ? 'Hide recent launches' : 'Show launches from the past 72 hours'}
            title={showRecent ? 'Hide recent launches' : 'Show launches from the past 72 hours'}
            onClick={() => setShowRecent(!showRecent)}
          >
            <Icon name="history" />
          </button>
        )}
        <button
          type="button"
          class={`icon-button${s.refreshing ? ' is-spinning' : ''}`}
          aria-label="Refresh launch data"
          title="Refresh launch data"
          disabled={s.refreshing}
          onClick={() => void refresh(true)}
        >
          <Icon name="refresh" />
        </button>
      </PageHeader>

      {loading ? <LaunchListSkeleton />
        : hardError ? (
          <MessageState icon="wifiOff" title="Couldn't load launches" body="Check your connection and try again.">
            <button type="button" class="button" onClick={() => void refresh(true)}>Retry</button>
          </MessageState>
        ) : (
          <>
            <div class="list-header">
              <DataStatusBanner status={status} lastUpdated={s.lastRefresh} />
              <p class="last-updated" data-testid="last-updated">
                {s.lastRefresh ? `Last updated ${formatLastUpdated(s.lastRefresh)}` : 'Not yet updated'}
              </p>
            </div>
            {shown.length === 0 ? (
              <MessageState icon="explore" title="No upcoming launches" body="We couldn't find any scheduled launches right now. Refresh to check again." />
            ) : (
              <section class="launch-grid" aria-label="Upcoming launches">
                {shown.map((launch) => {
                  const fav = isFavorite(s, 'LAUNCH', launch.id);
                  return (
                    <LaunchCard
                      key={launch.id}
                      launch={launch}
                      now={now}
                      isFavorite={fav}
                      onToggleFavorite={() => {
                        if (!fav) requestPermissionForFavorite();
                        setFavorite('LAUNCH', launch.id, launch.missionName, !fav);
                      }}
                    />
                  );
                })}
              </section>
            )}
          </>
        )}
    </>
  );
}
