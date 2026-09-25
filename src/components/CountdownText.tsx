import { useEffect, useState } from 'preact/hooks';
import { formatCountdown } from '../domain';

/**
 * A ticking "T− 3d 4h 21m" countdown. Ticks every second under an hour out, otherwise once a
 * minute — no point redrawing a days-away countdown 60×/min. Never goes negative.
 */
export function CountdownText({ net, passed, class: className = '', passedLabel = 'Launched' }: {
  net: number;
  passed: boolean;
  class?: string;
  passedLabel?: string;
}) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (passed) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      const remaining = net - current;
      if (remaining <= 0) return;
      // Wake right as the displayed value changes, not on an arbitrary wall-clock boundary.
      const unit = remaining <= 3_600_000 ? 1_000 : 60_000;
      timer = setTimeout(tick, (remaining % unit || unit) + 20);
    };
    tick();
    return () => clearTimeout(timer);
  }, [net, passed]);

  const remaining = net - now;
  return (
    <span class={`countdown ${className}`} data-testid="countdown">
      {passed || remaining <= 0 ? passedLabel : formatCountdown(remaining)}
    </span>
  );
}
