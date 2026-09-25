import { Icon } from '../icons';
import { paths } from '../router';

/** The "Support SpaceWatch" link shown on every page; it leads to the in-app Support page. */
export function SupportLink({ compact = false, current = false }: { compact?: boolean; current?: boolean }) {
  return (
    <a
      class={`pill-link pill-link--support${compact ? ' pill-link--compact' : ''}`}
      href={paths.support}
      aria-current={current ? 'page' : undefined}
      data-testid="support-link"
    >
      <Icon name="coffee" />
      <span>{compact ? 'Support' : 'Support SpaceWatch'}</span>
    </a>
  );
}
