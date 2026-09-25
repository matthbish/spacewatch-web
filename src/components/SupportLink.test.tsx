import { render, screen } from '@testing-library/preact';
import { expect, it } from 'vitest';
import { SupportLink } from './SupportLink';

it('leads to the in-app support page, not straight off-site', () => {
  render(<SupportLink />);
  const link = screen.getByRole('link', { name: 'Support SpaceWatch' });
  expect(link.getAttribute('href')).toBe('#/support');
  expect(link.getAttribute('target')).toBeNull();
});

it('has a compact form for the desktop rail', () => {
  render(<SupportLink compact />);
  expect(screen.getByRole('link', { name: 'Support' }).getAttribute('aria-current')).toBeNull();
});

it('marks itself current while on the support page', () => {
  render(<SupportLink compact current />);
  expect(screen.getByRole('link', { name: 'Support' }).getAttribute('aria-current')).toBe('page');
});
