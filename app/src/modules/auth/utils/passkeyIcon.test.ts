import { describe, expect, it } from 'vitest';
import { likelyPasskeyUnlock } from './passkeyIcon';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
const MAC_OR_IPAD =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

describe('likelyPasskeyUnlock', () => {
  it('expects Face ID on an iPhone', () => {
    expect(likelyPasskeyUnlock(IPHONE, 5)).toBe('face');
  });

  it('expects a fingerprint on Android', () => {
    expect(likelyPasskeyUnlock(ANDROID, 5)).toBe('fingerprint');
  });

  it('expects Touch ID on a Mac', () => {
    expect(likelyPasskeyUnlock(MAC_OR_IPAD, 0)).toBe('fingerprint');
  });

  it('does not guess for an iPad posing as a Mac', () => {
    expect(likelyPasskeyUnlock(MAC_OR_IPAD, 5)).toBe('unknown');
  });

  it('does not guess for Windows Hello', () => {
    expect(likelyPasskeyUnlock(WINDOWS, 0)).toBe('unknown');
  });
});
