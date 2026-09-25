import { PageHeader } from '../components/PageHeader';
import { REPO_URL } from '../config';
import { Icon } from '../icons';

/** Shown while no donation destination is configured (see SUPPORT_URL in config.ts). */
export function SupportScreen() {
  return (
    <>
      <PageHeader title="Support SpaceWatch" back />
      <div class="prose">
        <Icon name="coffee" class="prose__icon" />
        <p>
          SpaceWatch is free, open source, and has no ads, accounts, or tracking. A way to chip in toward its upkeep
          is coming soon.
        </p>
        <p>
          In the meantime, starring the project on GitHub or sharing it with someone who likes watching launches
          helps just as much.
        </p>
        <a class="button button--tonal" href={REPO_URL} target="_blank" rel="noopener noreferrer">SpaceWatch on GitHub</a>
      </div>
    </>
  );
}
