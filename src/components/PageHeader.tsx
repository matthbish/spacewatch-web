import type { ComponentChildren } from 'preact';
import { Icon } from '../icons';
import { goBack } from '../router';

/** Top app bar on mobile, a quiet page heading on desktop. */
export function PageHeader({ title, back = false, center = false, children }: {
  title: string;
  back?: boolean;
  center?: boolean;
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
    </header>
  );
}
