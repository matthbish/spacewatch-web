import { render, screen } from '@testing-library/preact';
import { expect, it } from 'vitest';
import { DataStatusBanner } from './DataStatusBanner';

const when = new Date(2026, 8, 14, 15, 42).getTime();

it('renders nothing for fresh data', () => {
  const { container } = render(<DataStatusBanner status="FRESH" lastUpdated={when} />);
  expect(container.innerHTML).toBe('');
});

it('says offline data is cached and from when', () => {
  render(<DataStatusBanner status="OFFLINE" lastUpdated={when} />);
  expect(screen.getByRole('status').textContent).toMatch(/You're offline\. Showing launches from September 14 at 3:42/);
});

it('says a failed refresh kept the saved data', () => {
  render(<DataStatusBanner status="REFRESH_FAILED" lastUpdated={when} />);
  expect(screen.getByRole('status').textContent).toMatch(/Refresh failed\. Showing the last saved launch data/);
});

it('flags stale data', () => {
  render(<DataStatusBanner status="STALE" lastUpdated={when} />);
  expect(screen.getByRole('status').textContent).toMatch(/more than 24 hours old/);
});
