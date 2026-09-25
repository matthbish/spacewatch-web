import { FavoriteButton } from '../components/FavoriteButton';
import { LaunchCard } from '../components/LaunchCard';
import { MessageState } from '../components/MessageState';
import { PageHeader } from '../components/PageHeader';
import { type Favorite, type FavoriteType, byNet } from '../domain';
import { Icon, type IconName } from '../icons';
import { paths } from '../router';
import { setFavorite, useNow, useStore } from '../store';

const ENTITY_SECTIONS: { type: FavoriteType; title: string; icon: IconName }[] = [
  { type: 'ROCKET', title: 'Rockets', icon: 'rocketLaunch' },
  { type: 'PROVIDER', title: 'Providers', icon: 'business' },
  { type: 'LOCATION', title: 'Launch sites', icon: 'locationOn' },
  { type: 'REGION', title: 'States & countries', icon: 'public' },
];

function EntityRow({ favorite, icon }: { favorite: Favorite; icon: IconName }) {
  return (
    <li class="entity-row" data-testid="entity-row">
      <a href={paths.entity(favorite.type, favorite.refId, favorite.displayName)}>
        <Icon name={icon} />
        <span>{favorite.displayName}</span>
      </a>
      <FavoriteButton isFavorite label={favorite.displayName}
        onToggle={() => setFavorite(favorite.type, favorite.refId, favorite.displayName, false)} />
    </li>
  );
}

export function FavoritesScreen() {
  const s = useStore((x) => x);
  const now = useNow();
  const launchIds = new Set(s.favorites.filter((f) => f.type === 'LAUNCH').map((f) => f.refId));
  const launches = s.launches.filter((l) => launchIds.has(l.id)).sort(byNet);
  const sections = ENTITY_SECTIONS
    .map((sec) => ({ ...sec, items: s.favorites.filter((f) => f.type === sec.type) }))
    .filter((sec) => sec.items.length > 0);

  return (
    <>
      <PageHeader title="Favorites" center />
      {launches.length === 0 && sections.length === 0 ? (
        <MessageState icon="star" title="No favorites yet" body="Favorite a launch, rocket, provider, launch site, or region to keep track of it here." />
      ) : (
        <div class="favorites">
          {launches.length > 0 && (
            <section aria-labelledby="fav-LAUNCH">
              <h2 class="section-label" id="fav-LAUNCH">Launches</h2>
              <div class="launch-grid">
                {launches.map((launch) => (
                  <LaunchCard key={launch.id} launch={launch} now={now} isFavorite
                    onToggleFavorite={() => setFavorite('LAUNCH', launch.id, launch.missionName, false)} />
                ))}
              </div>
            </section>
          )}
          {sections.map((sec) => (
            <section key={sec.type} aria-labelledby={`fav-${sec.type}`}>
              <h2 class="section-label" id={`fav-${sec.type}`}>{sec.title}</h2>
              <ul class="entity-list">
                {sec.items.map((f) => <EntityRow key={f.refId} favorite={f} icon={sec.icon} />)}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
