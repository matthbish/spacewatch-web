import type { ComponentChildren } from 'preact';
import { Icon } from '../icons';
import { goBack } from '../router';

/**
 * Top app bar on mobile, a quiet page heading on desktop. [busy] draws a thin progress line along
 * its bottom edge, the page-wide "something is loading" signal.
 */
export function PageHeader({ title, back = false, center = false, busy = false, children }: {
  title: string;
  back?: boolean;
  center?: boolean;
  busy?: boolean;
  children?: ComponentChildren;
}) {
  return (
    <header class={`page-header${center ? ' page-header--center' : ''}`}>
      {back && (
        <button type="button" class="icon-button" aria-label="Back" onClick={goBack}>
          <Icon name="arrowBack" />
        </button>
      )}
      <h1 class="page-header__title" tabIndex={-1}>{title}</h1>
      <div class="page-header__actions">{children}</div>
      {busy && <div class="page-header__progress" role="progressbar" aria-label="Refreshing launch data" />}
    </header>
  );
}
