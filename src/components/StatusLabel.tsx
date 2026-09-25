import type { LaunchStatus } from '../domain';

const LABELS: Record<LaunchStatus, string> = {
  GO: 'Go', IN_FLIGHT: 'In flight', SUCCESS: 'Success', FAILURE: 'Failure', PARTIAL_FAILURE: 'Partial failure',
  HOLD: 'Hold', TBD: 'TBD', TBC: 'TBC', UNKNOWN: 'Unknown',
};

const TONES: Record<LaunchStatus, string> = {
  GO: 'primary', IN_FLIGHT: 'primary', SUCCESS: 'success', FAILURE: 'error', PARTIAL_FAILURE: 'error',
  HOLD: 'tertiary', TBD: 'tertiary', TBC: 'tertiary', UNKNOWN: 'neutral',
};

/** Plain muted colored text, never a filled pill — status sits quietly next to the countdown. */
export function StatusLabel({ status }: { status: LaunchStatus }) {
  return <span class={`status status--${TONES[status]}`}>{LABELS[status]}</span>;
}
