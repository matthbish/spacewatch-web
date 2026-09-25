import { render, screen } from '@testing-library/preact';
import { expect, it } from 'vitest';
import { launch } from '../test-fixtures';
import { AskAi, launchPrompt } from './AskAi';

it('opens each chat in a new tab with the launch prefilled', () => {
  const l = launch({ missionName: 'Starlink 12-3', rocketName: 'Falcon 9' });
  render(<AskAi launch={l} />);
  for (const name of ['ChatGPT', 'Claude', 'Perplexity']) {
    const a = screen.getByRole('link', { name });
    expect(a.getAttribute('target')).toBe('_blank');
    const q = new URL(a.getAttribute('href')!).searchParams.get('q');
    expect(q).toBe(launchPrompt(l));
  }
});

it('leaves out fields the API did not provide', () => {
  const p = launchPrompt(launch({ rocketName: null, missionDescription: null, padName: null, locationName: null }));
  expect(p).not.toMatch(/Rocket:|Description:|Launch site:|null/);
});
