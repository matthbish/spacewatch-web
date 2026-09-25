import { fireEvent, render, screen } from '@testing-library/preact';
import { expect, it } from 'vitest';
import { LaunchImage } from './LaunchImage';

it('shows the photo with its credit, fading in once loaded', () => {
  render(<LaunchImage src="https://images.example/a.jpg" alt="Falcon 9 — Crew-13" credit="SpaceX" license="CC BY 2.0" />);
  const img = screen.getByRole('img', { name: 'Falcon 9 — Crew-13' });
  expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
  expect(screen.getByText('Image: SpaceX · CC BY 2.0')).toBeTruthy();
  expect(screen.getByTestId('launch-image').className).not.toContain('is-loaded');
  fireEvent.load(img);
  expect(screen.getByTestId('launch-image').className).toContain('is-loaded');
});

it('credits the source when the photographer is unknown', () => {
  render(<LaunchImage src="https://images.example/a.jpg" alt="x" credit={null} license={null} />);
  expect(screen.getByText('Image via The Space Devs')).toBeTruthy();
});

it('renders nothing without a photo, or when it fails to load', () => {
  const { container, rerender } = render(<LaunchImage src={null} alt="x" credit={null} license={null} />);
  expect(container.innerHTML).toBe('');
  rerender(<LaunchImage src="https://images.example/broken.jpg" alt="x" credit={null} license={null} />);
  fireEvent.error(screen.getByRole('img'));
  expect(screen.queryByTestId('launch-image')).toBeNull();
});
