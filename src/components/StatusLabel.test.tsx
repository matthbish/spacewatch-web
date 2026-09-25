import { render, screen } from '@testing-library/preact';
import { expect, it } from 'vitest';
import { StatusLabel } from './StatusLabel';

it.each([
  ['GO', 'Go', 'primary'],
  ['SUCCESS', 'Success', 'success'],
  ['FAILURE', 'Failure', 'error'],
  ['TBD', 'TBD', 'tertiary'],
  ['UNKNOWN', 'Unknown', 'neutral'],
] as const)('renders %s as a quiet "%s" label', (status, label, tone) => {
  render(<StatusLabel status={status} />);
  expect(screen.getByText(label).className).toContain(`status--${tone}`);
});
