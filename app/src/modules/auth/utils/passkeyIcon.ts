import type { Component } from 'vue';
import { FingerprintPattern, ScanFace, UserRoundKey } from '@lucide/vue';

export type PasskeyUnlock = 'face' | 'fingerprint' | 'unknown';

/**
 * Guesses how the device most likely unlocks a passkey. Only a hint for the
 * icon: the browser exposes no API for the actual authenticator.
 */
export function likelyPasskeyUnlock(
  userAgent: string,
  maxTouchPoints: number,
): PasskeyUnlock {
  const ua = userAgent.toLowerCase();

  if (ua.includes('iphone')) return 'face';
  if (ua.includes('android')) return 'fingerprint';
  // iPadOS reports itself as a Mac; only a touchless Mac has Touch ID.
  if (ua.includes('macintosh') && maxTouchPoints === 0) return 'fingerprint';
  return 'unknown';
}

const iconByUnlock: Record<PasskeyUnlock, Component> = {
  face: ScanFace,
  fingerprint: FingerprintPattern,
  unknown: UserRoundKey,
};

export const passkeyIcon: Component =
  typeof navigator === 'undefined'
    ? UserRoundKey
    : iconByUnlock[
        likelyPasskeyUnlock(navigator.userAgent, navigator.maxTouchPoints)
      ];
