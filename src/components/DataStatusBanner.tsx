import { type DataStatus, formatLastUpdated } from '../domain';
import { Icon, type IconName } from '../icons';

const STALE = 'This launch data is more than 24 hours old. Connect to the internet and refresh for the latest.';

/** Never lets cached data pass as current: offline, stale, and failed refreshes all say so. */
export function DataStatusBanner({ status, lastUpdated }: { status: DataStatus; lastUpdated: number | null }) {
  if (status === 'FRESH') return null;
  const when = lastUpdated === null ? null : formatLastUpdated(lastUpdated);
  const [icon, text]: [IconName, string] =
    status === 'OFFLINE' ? ['cloudOff', when ? `You're offline. Showing launches from ${when}. Reconnect and refresh for the latest.` : STALE]
      : status === 'REFRESH_FAILED' ? ['errorOutline', when ? `Refresh failed. Showing the last saved launch data from ${when}.` : STALE]
        : ['schedule', STALE];
  return (
    <div class="banner" role="status" data-testid="data-status-banner" data-status={status}>
      <Icon name={icon} />
      <p>{text}</p>
    </div>
  );
}
