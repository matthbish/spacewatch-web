import { describe, expect, it } from 'vitest';
import { parseRoute, paths } from './router';

describe('parseRoute', () => {
  it('parses top-level routes', () => {
    expect(parseRoute('')).toEqual({ name: 'home' });
    expect(parseRoute('#/')).toEqual({ name: 'home' });
    expect(parseRoute('#/favorites')).toEqual({ name: 'favorites' });
    expect(parseRoute('#/settings')).toEqual({ name: 'settings' });
    expect(parseRoute('#/support')).toEqual({ name: 'support' });
    expect(parseRoute(paths.install)).toEqual({ name: 'settings', section: 'install' });
  });

  it('round-trips launch and entity paths, including awkward characters', () => {
    expect(parseRoute(paths.launch('abc-123'))).toEqual({ name: 'launch', id: 'abc-123' });
    const label = 'Cape Canaveral SFS, FL, USA / 100%';
    expect(parseRoute(paths.entity('LOCATION', label, label))).toEqual({ name: 'entity', type: 'LOCATION', id: label, label });
    expect(parseRoute(paths.entity('REGION', 'USA:FL', 'FL, United States'))).toEqual({ name: 'entity', type: 'REGION', id: 'USA:FL', label: 'FL, United States' });
  });

  it('rejects unknown or malformed routes', () => {
    expect(parseRoute('#/nope')).toEqual({ name: 'notFound' });
    expect(parseRoute('#/launch')).toEqual({ name: 'notFound' });
    expect(parseRoute('#/entity/LAUNCH/x/y')).toEqual({ name: 'notFound' });
    expect(parseRoute('#/entity/BOGUS/x/y')).toEqual({ name: 'notFound' });
    expect(parseRoute('#/favorites/extra')).toEqual({ name: 'notFound' });
  });

  it('tolerates bad percent-encoding', () => {
    expect(parseRoute('#/launch/%E0%A4%A')).toEqual({ name: 'launch', id: '%E0%A4%A' });
  });
});
