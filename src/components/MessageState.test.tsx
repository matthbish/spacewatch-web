import { render, screen } from '@testing-library/preact';
import { expect, it } from 'vitest';
import { MessageState } from './MessageState';

it('renders title, body, and an optional action', () => {
  render(<MessageState icon="star" title="No favorites yet" body="Favorite something."><button>Go</button></MessageState>);
  expect(screen.getByRole('heading', { name: 'No favorites yet' })).toBeTruthy();
  expect(screen.getByText('Favorite something.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Go' })).toBeTruthy();
});
