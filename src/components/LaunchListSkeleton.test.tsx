import { render, screen } from '@testing-library/preact';
import { expect, it } from 'vitest';
import { LaunchListSkeleton } from './LaunchListSkeleton';

it('shows four busy placeholders', () => {
  render(<LaunchListSkeleton />);
  expect(screen.getAllByTestId('skeleton-item')).toHaveLength(4);
  expect(screen.getByLabelText('Loading launches').getAttribute('aria-busy')).toBe('true');
});
