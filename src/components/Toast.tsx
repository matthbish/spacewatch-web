import { useEffect, useState } from 'preact/hooks';
import { useStore } from '../store';

/** Brief confirmation after an action Polite live region, no focus steal. */
export function Toast() {
  const toast = useStore((s) => s.toast);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2_800);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <div class="toast-region" role="status" aria-live="polite">
      {toast && <div class={`toast${visible ? ' is-visible' : ''}`} key={toast.id}>{toast.text}</div>}
    </div>
  );
}
