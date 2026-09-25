import type { Launch } from './domain';

export const HOUR = 3_600_000;

export function launch(overrides: Partial<Launch> = {}): Launch {
  return {
    id: 'l1',
    missionName: 'Starlink Group 10-1',
    status: 'GO',
    net: Date.now() + 48 * HOUR,
    netIsPrecise: true,
    rocketId: '164',
    rocketName: 'Falcon 9 Block 5',
    providerId: '121',
    providerName: 'SpaceX',
    padName: 'Space Launch Complex 40',
    locationName: 'Cape Canaveral SFS, FL, USA',
    countryCode: 'USA',
    missionDescription: 'A batch of Starlink satellites.',
    missionType: 'Communications',
    webcastUrl: null,
    imageUrl: 'https://images.example/falcon9.jpg',
    imageCredit: 'SpaceX',
    imageLicense: null,
    ...overrides,
  };
}

/** A raw Launch Library 2.3.0 result, shaped like the real API. */
export function launchDto(overrides: Record<string, unknown> = {}) {
  return {
    id: 'l1',
    name: 'Falcon 9 Block 5 | Starlink Group 10-1',
    status: { id: 1, name: 'Go for Launch', abbrev: 'Go' },
    net: new Date(Date.now() + 48 * HOUR).toISOString(),
    net_precision: { abbrev: 'SEC' },
    rocket: { id: 8000, configuration: { id: 164, name: 'Falcon 9', full_name: 'Falcon 9 Block 5' } },
    launch_service_provider: { id: 121, name: 'SpaceX' },
    pad: { id: 80, name: 'Space Launch Complex 40', location: { id: 12, name: 'Cape Canaveral SFS, FL, USA', country: { alpha_3_code: 'USA', name: 'United States of America' } } },
    mission: { id: 1, name: 'Starlink Group 10-1', description: 'A batch of Starlink satellites.', type: 'Communications' },
    vid_urls: [{ priority: 1, url: 'https://example.com/low' }, { priority: 10, url: 'https://example.com/high' }],
    image: {
      image_url: 'https://images.example/f9-full.jpg',
      thumbnail_url: 'https://images.example/f9-thumb.jpg',
      credit: 'SpaceX',
      license: { name: 'Unknown', link: null },
    },
    ...overrides,
  };
}
