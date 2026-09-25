import { fireEvent, render, screen } from '@testing-library/preact';
import { expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

it('renders the page title as the h1 with optional actions', () => {
  render(<PageHeader title="Favorites"><button>Act</button></PageHeader>);
  expect(screen.getByRole('heading', { level: 1, name: 'Favorites' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Act' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
});

it('goes home from a deep link with nowhere to go back to', () => {
  render(<PageHeader title="Detail" back />);
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(location.hash).toBe('#/');
});
