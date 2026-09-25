import { useEffect, useState } from 'preact/hooks';
import { CountdownText } from '../components/CountdownText';
import { FavoriteButton } from '../components/FavoriteButton';
import { LaunchListSkeleton } from '../components/LaunchListSkeleton';
import { MessageState } from '../components/MessageState';
import { PageHeader } from '../components/PageHeader';
import { StatusLabel } from '../components/StatusLabel';
import { deriveRegion, formatLaunchDateTime, hasPassed } from '../domain';
import { Icon } from '../icons';
import { requestPermissionForFavorite } from '../notifications';
import { paths } from '../router';
import { isFavorite, setFavorite, showToast, useNow, useStore } from '../store';

/**
 * Launch Library webcast links are often dead. A no-cors HEAD can't read the status, but it does
 * reject for a dead host. ponytail: a removed video on a live host (e.g. YouTube) still passes.
 */
function useReachable(url: string | null): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    setOk(false);
    if (!url || !/^https?:\/\//.test(url)) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4_000);
    fetch(url, { method: 'HEAD', mode: 'no-cors', signal: ctrl.signal })
      .then(() => setOk(true), () => setOk(false))
      .finally(() => clearTimeout(t));
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [url]);
  return ok;
}

function DetailRow({ label, value, href }: { label: string; value: string | null; href?: string }) {
  if (!value) return null;
  return (
    <div class="detail-row">
      <dt>{label}</dt>
      <dd>{href ? <a href={href}>{value}</a> : value}</dd>
    </div>
  );
}

export function DetailScreen({ id }: { id: string }) {
  const s = useStore((x) => x);
  const now = useNow(1_000);
  const launch = s.launches.find((l) => l.id === id) ?? null;
  const webcastOk = useReachable(launch?.webcastUrl ?? null);

  if (!launch) {
    const loading = s.launches.length === 0 && (s.refreshing || s.lastResult === null);
    return (
      <>
        <PageHeader title={loading ? 'Loading…' : 'Launch not found'} back />
        {loading ? <LaunchListSkeleton /> : (
          <MessageState icon="explore" title="Launch not found" body="This launch is no longer in the schedule. It may have been removed, or launched a while ago.">
            <a class="button" href={paths.home}>See upcoming launches</a>
          </MessageState>
        )}
      </>
    );
  }

  const fav = isFavorite(s, 'LAUNCH', launch.id);
  const passed = hasPassed(launch, now);
  const region = deriveRegion(launch.locationName, launch.countryCode);
  const site = [launch.padName, launch.locationName].filter(Boolean).join(', ') || null;

  return (
    <>
      <PageHeader title={launch.missionName} back>
        <FavoriteButton
          isFavorite={fav}
          label={launch.missionName}
          onToggle={() => {
            if (!fav) requestPermissionForFavorite();
            setFavorite('LAUNCH', launch.id, launch.missionName, !fav);
            showToast(fav ? 'Removed from favorites' : 'Added to favorites');
          }}
        />
      </PageHeader>

      <article class="detail">
        <div class="detail__countdown">
          <CountdownText net={launch.net} passed={passed} class="countdown--large" />
          <StatusLabel status={launch.status} />
        </div>
        <p class="detail__date">
          <time dateTime={new Date(launch.net).toISOString()}>{formatLaunchDateTime(launch.net)}</time>
        </p>

        <hr />

        <dl class="detail__rows">
          <DetailRow label="Rocket" value={launch.rocketName}
            href={launch.rocketId && launch.rocketName ? paths.entity('ROCKET', launch.rocketId, launch.rocketName) : undefined} />
          <DetailRow label="Provider" value={launch.providerName}
            href={launch.providerId && launch.providerName ? paths.entity('PROVIDER', launch.providerId, launch.providerName) : undefined} />
          <DetailRow label="Launch site" value={site}
            href={launch.locationName ? paths.entity('LOCATION', launch.locationName, launch.locationName) : undefined} />
        </dl>
        {region && (
          <a class="region-link" href={paths.entity('REGION', region[0], region[1])}>
            <Icon name="public" />{region[1]}
          </a>
        )}

        {launch.missionDescription && (
          <>
            <hr />
            <section class="detail__about">
              <h2>About this mission</h2>
              <p>{launch.missionDescription}</p>
            </section>
          </>
        )}

        {webcastOk && launch.webcastUrl && (
          <a class="text-button" href={launch.webcastUrl} target="_blank" rel="noopener noreferrer">
            <Icon name="openInNew" />View mission page
          </a>
        )}
      </article>
    </>
  );
}
