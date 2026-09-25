import { FavoriteButton } from '../components/FavoriteButton';
import { LaunchCard } from '../components/LaunchCard';
import { MessageState } from '../components/MessageState';
import { PageHeader } from '../components/PageHeader';
import { type FavoriteType, byNet, launchMatchesEntity } from '../domain';
import { requestPermissionForFavorite } from '../notifications';
import { isFavorite, setFavorite, showToast, useNow, useStore } from '../store';

/** Every cached launch for one rocket / provider / launch site / region. */
export function EntityLaunchesScreen({ type, id, label }: { type: FavoriteType; id: string; label: string }) {
  const s = useStore((x) => x);
  const now = useNow();
  const launches = s.launches.filter((l) => launchMatchesEntity(l, type, id)).sort(byNet);
  const fav = isFavorite(s, type, id);

  return (
    <>
      <PageHeader title={label} back>
        <FavoriteButton
          isFavorite={fav}
          label={label}
          onToggle={() => {
            // Favoriting an entity auto-tracks every matching launch, now and later — exactly
            // the moment reminders become relevant, so ask for permission here.
            if (!fav) requestPermissionForFavorite();
            setFavorite(type, id, label, !fav);
            showToast(fav ? 'Removed from favorites' : 'Added to favorites');
          }}
        />
      </PageHeader>
      {launches.length === 0 ? (
        <MessageState icon="rocketLaunch" title="No upcoming launches" body="We couldn't find any scheduled launches for this right now." />
      ) : (
        <section class="launch-grid" aria-label={`Launches for ${label}`}>
          {launches.map((launch) => {
            const lf = isFavorite(s, 'LAUNCH', launch.id);
            return (
              <LaunchCard key={launch.id} launch={launch} now={now} isFavorite={lf} onToggleFavorite={() => {
                if (!lf) requestPermissionForFavorite();
                setFavorite('LAUNCH', launch.id, launch.missionName, !lf);
              }} />
            );
          })}
        </section>
      )}
    </>
  );
}
