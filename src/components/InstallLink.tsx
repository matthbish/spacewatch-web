import { promptInstall } from '../install';
import { Icon } from '../icons';
import { paths } from '../router';
import { useStore } from '../store';

/**
 * The quiet "Install app" suggestion beside Support. Opens the browser's own install dialog where
 * one exists (Chromium); elsewhere it leads to the install steps in Settings. Gone once installed,
 * or when switched off in Settings.
 */
export function InstallLink({ compact = false }: { compact?: boolean }) {
  const show = useStore((s) => !s.installed && s.settings.suggestInstall);
  const canPrompt = useStore((s) => s.canPromptInstall);
  if (!show) return null;
  return (
    <a
      class={`pill-link pill-link--install${compact ? ' pill-link--compact' : ''}`}
      href={paths.install}
      data-testid="install-link"
      onClick={(e) => {
        if (!canPrompt) return;
        e.preventDefault();
        void promptInstall();
      }}
    >
      <Icon name="installMobile" />
      <span>{compact ? 'Install' : 'Install app'}</span>
    </a>
  );
}
