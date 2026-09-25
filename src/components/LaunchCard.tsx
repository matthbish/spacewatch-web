import { type Launch, formatLaunchDateTimeCompact, hasPassed, isSoon } from '../domain';
import { Icon } from '../icons';
import { paths } from '../router';
import { CountdownText } from './CountdownText';
import { FavoriteButton } from './FavoriteButton';
import { StatusLabel } from './StatusLabel';

/**
 * Hierarchy is Rocket > Provider > Mission. "Launching soon" gets a barely-there tint and a
 * thin border, never a saturated fill; a launch that already happened quietly fades.
 */
export function LaunchCard({ launch, isFavorite, onToggleFavorite, now = Date.now() }: {
  launch: Launch;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  now?: number;
}) {
  const passed = hasPassed(launch, now);
  const soon = isSoon(launch, now);
  const primary = launch.rocketName ?? launch.missionName;
  return (
    <article class={`launch-card${soon ? ' is-soon' : ''}${passed ? ' is-past' : ''}`} data-testid="launch-card">
      <a class="launch-card__link" href={paths.launch(launch.id)} aria-label={`${primary}${launch.rocketName ? `, ${launch.missionName}` : ''}`} />
      <div class="launch-card__body">
        <div class="launch-card__head">
          <div class="launch-card__titles">
            <h3 class="launch-card__rocket">{primary}</h3>
            {launch.providerName && <p class="launch-card__provider">{launch.providerName}</p>}
          </div>
          <FavoriteButton isFavorite={isFavorite} onToggle={onToggleFavorite} label={launch.missionName} />
        </div>
        {launch.rocketName && <p class="launch-card__mission">{launch.missionName}</p>}
        <div class="launch-card__foot">
          <div class="launch-card__location">
            {launch.locationName && <><Icon name="locationOn" /><span>{launch.locationName}</span></>}
          </div>
          <div class="launch-card__time">
            <StatusLabel status={launch.status} />
            <CountdownText net={launch.net} passed={passed} class="countdown--compact" />
            <time dateTime={new Date(launch.net).toISOString()}>{formatLaunchDateTimeCompact(launch.net)}</time>
          </div>
        </div>
      </div>
    </article>
  );
}
