import { act, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { showToast } from '../store';
import { Toast } from './Toast';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

it('announces a message politely, then hides it', () => {
  render(<Toast />);
  act(() => { showToast('Added to favorites'); });
  expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite');
  expect(screen.getByText('Added to favorites').className).toContain('is-visible');
  act(() => { vi.advanceTimersByTime(3_000); });
  expect(screen.getByText('Added to favorites').className).not.toContain('is-visible');
});
