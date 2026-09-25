import type { ComponentChildren } from 'preact';
import { Icon, type IconName } from '../icons';

/** The one shared shape for every empty / error / not-found state. */
export function MessageState({ icon, title, body, children }: {
  icon: IconName;
  title: string;
  body: string;
  children?: ComponentChildren;
}) {
  return (
    <div class="message-state" data-testid="message-state">
      <Icon name={icon} class="message-state__icon" />
      <h2>{title}</h2>
      <p>{body}</p>
      {children}
    </div>
  );
}
