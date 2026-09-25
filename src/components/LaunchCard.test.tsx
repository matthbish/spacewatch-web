import { fireEvent, render, screen } from '@testing-library/preact';
import { expect, it, vi } from 'vitest';
import { HOUR, launch } from '../test-fixtures';
import { LaunchCard } from './LaunchCard';

it('leads with rocket, then provider, then mission, and links to the detail page', () => {
  render(<LaunchCard launch={launch()} isFavorite={false} onToggleFavorite={() => {}} />);
  expect(screen.getByRole('heading').textContent).toBe('Falcon 9 Block 5');
  expect(screen.getByText('SpaceX')).toBeTruthy();
  expect(screen.getByText('Starlink Group 10-1')).toBeTruthy();
  expect(screen.getByText('Cape Canaveral SFS, FL, USA')).toBeTruthy();
  expect(screen.getByText('Go')).toBeTruthy();
  expect(screen.getByRole('link').getAttribute('href')).toBe('#/launch/l1');
});

it('falls back to the mission name when the rocket is unknown', () => {
  render(<LaunchCard launch={launch({ rocketName: null })} isFavorite={false} onToggleFavorite={() => {}} />);
  expect(screen.getByRole('heading').textContent).toBe('Starlink Group 10-1');
});

it('marks launches within 24 hours as soon, and past launches as past', () => {
  const now = Date.now();
  const { rerender } = render(<LaunchCard launch={launch({ net: now + 2 * HOUR })} now={now} isFavorite={false} onToggleFavorite={() => {}} />);
  expect(screen.getByTestId('launch-card').className).toContain('is-soon');
  rerender(<LaunchCard launch={launch({ net: now - HOUR, status: 'SUCCESS' })} now={now} isFavorite={false} onToggleFavorite={() => {}} />);
  expect(screen.getByTestId('launch-card').className).toContain('is-past');
  expect(screen.getByTestId('countdown').textContent).toBe('Launched');
});

it('toggles favorite from the card', () => {
  const onToggle = vi.fn();
  render(<LaunchCard launch={launch()} isFavorite={false} onToggleFavorite={onToggle} />);
  fireEvent.click(screen.getByRole('button', { name: /Favorite/ }));
  expect(onToggle).toHaveBeenCalled();
});
