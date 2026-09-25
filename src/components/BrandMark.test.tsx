import { render, screen } from '@testing-library/preact';
import { expect, it } from 'vitest';
import { BrandMark } from './BrandMark';

it('renders the labelled mark at the requested size', () => {
  render(<BrandMark size={48} />);
  const mark = screen.getByRole('img', { name: 'SpaceWatch' });
  expect(mark.getAttribute('width')).toBe('48');
  expect(mark.querySelector('circle')).not.toBeNull();
});
