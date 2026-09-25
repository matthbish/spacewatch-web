import { act, render, screen } from '@testing-library/preact';
import { beforeEach, expect, it } from 'vitest';
import { reloadFromStorage, setState, updateSettings } from '../store';
import { InstallLink } from './InstallLink';

beforeEach(() => {
  reloadFromStorage();
  setState({ installed: false, canPromptInstall: false }, false);
});

it('suggests installing, leading to the install steps in Settings', () => {
  render(<InstallLink />);
  expect(screen.getByRole('link', { name: 'Install app' }).getAttribute('href')).toBe('#/settings/install');
});

it('has a compact form for the desktop rail', () => {
  render(<InstallLink compact />);
  expect(screen.getByRole('link', { name: 'Install' })).toBeTruthy();
});

it('disappears once installed, or when switched off', () => {
  render(<InstallLink />);
  act(() => { setState({ installed: true }, false); });
  expect(screen.queryByTestId('install-link')).toBeNull();
  act(() => { setState({ installed: false }, false); updateSettings({ suggestInstall: false }); });
  expect(screen.queryByTestId('install-link')).toBeNull();
});
