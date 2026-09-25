import { describe, expect, it } from 'vitest';
import {
  computeDataStatus, deriveRegion, formatCountdown, formatLastUpdated, hasPassed, isSoon, isTracked,
  launchMatchesEntity, mapLaunchDto, mapLaunchesResponse, mergeLaunches, recentlyLaunched, statusFromAbbrev,
  timelineLaunches, upcomingOnly,
} from './domain';
import { HOUR, launch, launchDto } from './test-fixtures';

describe('statusFromAbbrev', () => {
  it('maps every known API abbreviation, case- and whitespace-insensitively', () => {
    expect(statusFromAbbrev('Go')).toBe('GO');
    expect(statusFromAbbrev(' TBD ')).toBe('TBD');
    expect(statusFromAbbrev('TBC')).toBe('TBC');
    expect(statusFromAbbrev('Hold')).toBe('HOLD');
    expect(statusFromAbbrev('In Flight')).toBe('IN_FLIGHT');
    expect(statusFromAbbrev('Success')).toBe('SUCCESS');
    expect(statusFromAbbrev('Failure')).toBe('FAILURE');
    expect(statusFromAbbrev('Partial Failure')).toBe('PARTIAL_FAILURE');
  });
  it('falls back to UNKNOWN for anything else', () => {
    expect(statusFromAbbrev('Scrubbed?')).toBe('UNKNOWN');
    expect(statusFromAbbrev(null)).toBe('UNKNOWN');
    expect(statusFromAbbrev(undefined)).toBe('UNKNOWN');
  });
});

describe('formatCountdown', () => {
  it('uses days/hours/minutes when more than a day out', () => {
    expect(formatCountdown(3 * 86_400_000 + 4 * HOUR + 21 * 60_000)).toBe('T− 3d 4h 21m');
  });
  it('drops days under a day out', () => {
    expect(formatCountdown(2 * HOUR + 14 * 60_000 + 59_000)).toBe('T− 2h 14m');
  });
  it('shows seconds under an hour out', () => {
    expect(formatCountdown(38 * 60_000 + 12_000)).toBe('T− 38m 12s');
  });
  it('never goes negative', () => {
    expect(formatCountdown(-5_000)).toBe('T− 0m 0s');
  });
});

describe('passed / soon', () => {
  const now = Date.now();
  it('treats a final status as passed even if net is ahead', () => {
    expect(hasPassed(launch({ status: 'SUCCESS', net: now + HOUR }), now)).toBe(true);
  });
  it('is soon within 24 hours, not beyond, and never once passed', () => {
    expect(isSoon(launch({ net: now + 23 * HOUR }), now)).toBe(true);
    expect(isSoon(launch({ net: now + 25 * HOUR }), now)).toBe(false);
    expect(isSoon(launch({ net: now - 1 }), now)).toBe(false);
  });
});

describe('deriveRegion', () => {
  it('uses the US state for American sites', () => {
    expect(deriveRegion('Cape Canaveral SFS, FL, USA', 'USA')).toEqual(['USA:FL', 'FL, United States']);
  });
  it('uses the country elsewhere, with friendly names for known codes', () => {
    expect(deriveRegion('Baikonur Cosmodrome, Republic of Kazakhstan', 'KAZ')).toEqual(['KAZ', 'Kazakhstan']);
    expect(deriveRegion('Somewhere', 'XYZ')).toEqual(['XYZ', 'XYZ']);
  });
  it('falls back to the country when the US state is unparseable', () => {
    expect(deriveRegion('USA', 'USA')).toEqual(['USA', 'United States']);
  });
  it('returns null with no country', () => {
    expect(deriveRegion('Somewhere', null)).toBeNull();
    expect(deriveRegion('Somewhere', ' ')).toBeNull();
  });
});

describe('entity matching', () => {
  const l = launch();
  it('matches each entity type on its own field', () => {
    expect(launchMatchesEntity(l, 'ROCKET', '164')).toBe(true);
    expect(launchMatchesEntity(l, 'PROVIDER', '121')).toBe(true);
    expect(launchMatchesEntity(l, 'LOCATION', 'Cape Canaveral SFS, FL, USA')).toBe(true);
    expect(launchMatchesEntity(l, 'REGION', 'USA:FL')).toBe(true);
    expect(launchMatchesEntity(l, 'ROCKET', '1')).toBe(false);
    expect(launchMatchesEntity(l, 'LAUNCH', 'l1')).toBe(false);
  });
  it('tracks launches favorited directly or via any entity', () => {
    const fav = (type: 'LAUNCH' | 'ROCKET', refId: string) => ({ type, refId, displayName: '', savedAt: 0 });
    expect(isTracked(l, [fav('LAUNCH', 'l1')])).toBe(true);
    expect(isTracked(l, [fav('ROCKET', '164')])).toBe(true);
    expect(isTracked(l, [fav('ROCKET', '999'), fav('LAUNCH', 'other')])).toBe(false);
  });
});

describe('list shaping', () => {
  const now = Date.now();
  const past1 = launch({ id: 'p1', net: now - 2 * HOUR });
  const past2 = launch({ id: 'p2', net: now - 10 * HOUR });
  const old = launch({ id: 'old', net: now - 100 * HOUR });
  const next = launch({ id: 'n1', net: now + HOUR });
  const later = launch({ id: 'n2', net: now + 5 * HOUR });
  const doneEarly = launch({ id: 'd', net: now + HOUR, status: 'SUCCESS' });

  it('upcomingOnly keeps future, non-final launches in chronological order', () => {
    expect(upcomingOnly([later, past1, doneEarly, next], now).map((l) => l.id)).toEqual(['n1', 'n2']);
  });
  it('recentlyLaunched returns the last 72h, most recent first', () => {
    expect(recentlyLaunched([old, past2, past1, next], now).map((l) => l.id)).toEqual(['p1', 'p2']);
  });
  it('recentlyLaunched falls back to the single most recent past launch', () => {
    expect(recentlyLaunched([old, launch({ id: 'older', net: now - 200 * HOUR }), next], now).map((l) => l.id)).toEqual(['old']);
    expect(recentlyLaunched([next], now)).toEqual([]);
  });
  it('timelineLaunches weaves recent launches in chronologically only when shown', () => {
    expect(timelineLaunches([next, later], [past1], true).map((l) => l.id)).toEqual(['p1', 'n1', 'n2']);
    expect(timelineLaunches([next, later], [past1], false).map((l) => l.id)).toEqual(['n1', 'n2']);
  });
  it('mergeLaunches upserts, drops superseded future launches, keeps recent history', () => {
    const cancelled = launch({ id: 'gone', net: now + 10 * HOUR });
    const ancient = launch({ id: 'ancient', net: now - 24 * 8 * HOUR });
    const updated = launch({ id: 'n1', net: now + 2 * HOUR, missionName: 'Renamed' });
    const merged = mergeLaunches([next, cancelled, past1, ancient], [updated, later], now);
    expect(merged.map((l) => l.id)).toEqual(['p1', 'n1', 'n2']);
    expect(merged[1].missionName).toBe('Renamed');
  });
});

describe('computeDataStatus', () => {
  it('prioritizes refresh failure, then offline, then stale', () => {
    expect(computeDataStatus(true, true, true)).toBe('REFRESH_FAILED');
    expect(computeDataStatus(false, true, false)).toBe('OFFLINE');
    expect(computeDataStatus(true, true, false)).toBe('STALE');
    expect(computeDataStatus(true, false, false)).toBe('FRESH');
  });
});

describe('API mapping', () => {
  it('maps a full result', () => {
    const l = mapLaunchDto(launchDto())!;
    expect(l).toMatchObject({
      id: 'l1', missionName: 'Starlink Group 10-1', status: 'GO', rocketId: '164', rocketName: 'Falcon 9 Block 5',
      providerId: '121', providerName: 'SpaceX', padName: 'Space Launch Complex 40',
      locationName: 'Cape Canaveral SFS, FL, USA', countryCode: 'USA', webcastUrl: 'https://example.com/high',
      netIsPrecise: false, imageUrl: 'https://images.example/f9-full.jpg', imageCredit: 'SpaceX',
      // "Unknown" is what the API says when it doesn't know; not worth showing.
      imageLicense: null,
    });
  });
  it('keeps a known image license', () => {
    const l = mapLaunchDto(launchDto({ image: { image_url: 'https://x/y.jpg', credit: null, license: { name: 'CC BY 2.0' } } }))!;
    expect(l).toMatchObject({ imageUrl: 'https://x/y.jpg', imageCredit: null, imageLicense: 'CC BY 2.0' });
  });
  it('still maps the older 2.2.0 shape (country_code, vidURLs, plain image URL)', () => {
    const l = mapLaunchDto(launchDto({
      pad: { name: 'LC-39A', location: { name: 'Kennedy Space Center, FL, USA', country_code: 'USA' } },
      vid_urls: undefined,
      vidURLs: [{ priority: 1, url: 'https://example.com/v' }],
      image: 'https://images.example/plain.jpg',
    }))!;
    expect(l).toMatchObject({ countryCode: 'USA', webcastUrl: 'https://example.com/v', imageUrl: 'https://images.example/plain.jpg', imageCredit: null });
  });
  it('degrades missing or wrongly-typed fields to null instead of failing', () => {
    const l = mapLaunchDto({ id: 7, name: 'Bare', rocket: 'nope', pad: { location: null }, vidURLs: 'x', net: 'garbage' })!;
    expect(l).toMatchObject({ id: '7', missionName: 'Bare', status: 'UNKNOWN', rocketName: null, locationName: null, webcastUrl: null, net: 0, netIsPrecise: true, imageUrl: null });
  });
  it('falls back to rocket short name, then launch name, then a placeholder', () => {
    expect(mapLaunchDto(launchDto({ rocket: { configuration: { id: 1, name: 'Electron' } } }))!.rocketName).toBe('Electron');
    expect(mapLaunchDto({ id: 'x' })!.missionName).toBe('Untitled mission');
  });
  it('drops entries without an id, keeps the rest', () => {
    expect(mapLaunchesResponse({ results: [launchDto(), { name: 'no id' }, null] })).toHaveLength(1);
  });
  it('throws on a response that is not a launch list', () => {
    expect(() => mapLaunchesResponse({ detail: 'nope' })).toThrow(SyntaxError);
    expect(() => mapLaunchesResponse(null)).toThrow(SyntaxError);
  });
});

describe('formatLastUpdated', () => {
  it('reads like "September 14 at 3:42 PM"', () => {
    expect(formatLastUpdated(new Date(2026, 8, 14, 15, 42).getTime())).toMatch(/September 14 at 3:42\s?PM/);
  });
});
