import { SUPPORT_URL } from '../config';
import { Icon } from '../icons';
import { paths } from '../router';

/**
 * The quiet "Support SpaceWatch" link shown on every page. Provider-agnostic: it's whatever
 * SUPPORT_URL points at, or the in-app support page while that's unset.
 */
export function SupportLink({ compact = false }: { compact?: boolean }) {
  const external = SUPPORT_URL !== '';
  return (
    <a
      class={`support-link${compact ? ' support-link--compact' : ''}`}
      href={external ? SUPPORT_URL : paths.support}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      data-testid="support-link"
    >
      <Icon name="coffee" />
      <span>{compact ? 'Support' : 'Support SpaceWatch'}</span>
    </a>
  );
}
