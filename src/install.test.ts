import { describe, expect, it } from 'vitest';
import { INSTALL_STEPS, installPlatform } from './install';

const UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  iphoneFirefox: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/140.0 Mobile/15E148 Safari/605.1.15',
  ipadDesktopMode: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  androidFirefox: 'Mozilla/5.0 (Android 15; Mobile; rv:143.0) Gecko/143.0 Firefox/143.0',
  androidChrome: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
  windowsFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0',
  windowsEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 Edg/140.0',
};

describe('installPlatform', () => {
  it('recognizes iOS, including any iOS browser and iPad in desktop mode', () => {
    expect(installPlatform(UA.iphoneSafari)).toBe('ios');
    expect(installPlatform(UA.iphoneFirefox)).toBe('ios');
    expect(installPlatform(UA.ipadDesktopMode, 'MacIntel', 5)).toBe('ios');
  });
  it('tells Firefox for Android apart from other Android browsers', () => {
    expect(installPlatform(UA.androidFirefox)).toBe('android-firefox');
    expect(installPlatform(UA.androidChrome)).toBe('android');
  });
  it('handles desktop browsers', () => {
    expect(installPlatform(UA.macSafari, 'MacIntel', 0)).toBe('mac-safari');
    expect(installPlatform(UA.macChrome, 'MacIntel', 0)).toBe('desktop');
    expect(installPlatform(UA.windowsFirefox)).toBe('desktop-firefox');
    expect(installPlatform(UA.windowsEdge)).toBe('desktop');
  });
  it('has steps for every platform', () => {
    expect(INSTALL_STEPS['android-firefox']).toContain('Add app to Home screen');
    expect(INSTALL_STEPS.ios).toContain('Add to Home Screen');
  });
});
