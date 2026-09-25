import { act, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CountdownText } from './CountdownText';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-25T12:00:00Z')); });
afterEach(() => { vi.useRealTimers(); });

it('shows days/hours/minutes for a distant launch', () => {
  render(<CountdownText net={Date.now() + (3 * 86_400 + 4 * 3_600 + 21 * 60) * 1000} passed={false} />);
  expect(screen.getByTestId('countdown').textContent).toBe('T− 3d 4h 21m');
});

it('ticks every second under an hour out', async () => {
  render(<CountdownText net={Date.now() + 10 * 60_000} passed={false} />);
  expect(screen.getByTestId('countdown').textContent).toBe('T− 10m 0s');
  await act(async () => { await vi.advanceTimersByTimeAsync(1_100); });
  expect(screen.getByTestId('countdown').textContent).toBe('T− 9m 59s');
});

it('switches to the post-launch label instead of going negative', async () => {
  render(<CountdownText net={Date.now() + 1_500} passed={false} />);
  await act(async () => { await vi.advanceTimersByTimeAsync(3_000); });
  expect(screen.getByTestId('countdown').textContent).toBe('Launched');
});

it('shows the passed label for a finished launch', () => {
  render(<CountdownText net={Date.now() + 60_000} passed passedLabel="Done" />);
  expect(screen.getByTestId('countdown').textContent).toBe('Done');
});
