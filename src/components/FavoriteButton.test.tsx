import { fireEvent, render, screen } from '@testing-library/preact';
import { expect, it, vi } from 'vitest';
import { FavoriteButton } from './FavoriteButton';

it('exposes pressed state and an action-specific label', () => {
  const { rerender } = render(<FavoriteButton isFavorite={false} onToggle={() => {}} label="Falcon 9" />);
  expect(screen.getByRole('button', { name: 'Favorite Falcon 9' }).getAttribute('aria-pressed')).toBe('false');
  rerender(<FavoriteButton isFavorite onToggle={() => {}} label="Falcon 9" />);
  expect(screen.getByRole('button', { name: 'Unfavorite Falcon 9' }).getAttribute('aria-pressed')).toBe('true');
});

it('toggles without triggering the surrounding link', () => {
  const onToggle = vi.fn();
  const onLinkClick = vi.fn();
  render(<div onClick={onLinkClick}><FavoriteButton isFavorite={false} onToggle={onToggle} /></div>);
  fireEvent.click(screen.getByRole('button'));
  expect(onToggle).toHaveBeenCalledTimes(1);
  expect(onLinkClick).not.toHaveBeenCalled();
});
