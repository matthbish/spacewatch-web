import { PageHeader } from '../components/PageHeader';
import { REPO_URL, SUPPORT_OPTIONS } from '../config';
import { Icon } from '../icons';

export function SupportScreen() {
  return (
    <>
      <PageHeader title="Support SpaceWatch" back />
      <div class="prose">
        <Icon name="coffee" class="prose__icon" />
        <p>
          SpaceWatch is free, open source, and has no ads, accounts, or tracking. If it's useful to you, chipping in
          helps cover its upkeep and keeps it that way.
        </p>
        <ul class="support-options">
          {SUPPORT_OPTIONS.map((option) => (
            <li key={option.url}>
              <a class="support-option" href={option.url} target="_blank" rel="noopener noreferrer" data-testid="support-option">
                <span class="support-option__label">{option.label}<span class="sr-only"> (opens in a new tab)</span></span>
                <span class="support-option__hint">{option.hint}</span>
                <Icon name="openInNew" />
              </a>
            </li>
          ))}
        </ul>
        <p class="prose__aside">
          Not in a position to? Starring the project on{' '}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">GitHub</a> or sharing it with someone who likes
          watching launches helps too.
        </p>
      </div>
    </>
  );
}
