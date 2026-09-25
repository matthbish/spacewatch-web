import { PageHeader } from '../components/PageHeader';
import { REPO_URL, SUPPORT_URL } from '../config';
import { Icon } from '../icons';

export function SupportScreen() {
  return (
    <>
      <PageHeader title="Support SpaceWatch" back />
      <div class="prose">
        <Icon name="coffee" class="prose__icon" />
        <p>
          SpaceWatch is free, open source, and has no ads, accounts, or tracking. If it's useful to you, sponsoring
          helps cover its upkeep and keeps it that way.
        </p>
        <a class="button" href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" data-testid="sponsor-button">
          Sponsor on GitHub<span class="sr-only"> (opens in a new tab)</span>
        </a>
        <p class="prose__aside">
          Not in a position to? Starring the project on{' '}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">GitHub</a> or sharing it with someone who likes
          watching launches helps too.
        </p>
      </div>
    </>
  );
}
