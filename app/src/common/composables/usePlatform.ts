import { ref } from 'vue';

export function usePlatform() {
  const isBrowser = typeof window !== 'undefined';

  const nav = isBrowser ? window.navigator : ({} as Navigator);
  const ua = (isBrowser ? nav.userAgent : '').toLowerCase();
  const platform = (isBrowser ? (nav as any).platform || '' : '').toLowerCase();

  const isMac = platform.includes('mac') || ua.includes('macintosh');
  const isWindows = platform.includes('win') || ua.includes('windows');
  const isLinux = platform.includes('linux') || ua.includes('linux');

  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const isMobile = isIOS || isAndroid || /mobile/.test(ua);

  const isChrome = /chrome/.test(ua) && !/edge|edg|opr/.test(ua);
  const isSafari = /safari/.test(ua) && !/chrome/.test(ua);
  const isFirefox = /firefox/.test(ua);
  const isEdge = /edg/.test(ua) || /edge/.test(ua);

  const isTouch = ref(
    isBrowser && ('ontouchstart' in window || nav.maxTouchPoints > 0),
  );

  const shortcutSymbol = isMac ? '⌘' : 'Ctrl';
  const optionSymbol = isMac ? '⌥' : 'Alt';
  const shiftSymbol = isMac ? '⇧' : 'Shift';
  const altSymbol = isMac ? '⌥' : 'Alt';

  const shortcutLabel = isMac ? 'Command' : 'Control';

  return {
    isBrowser,

    isMac,
    isWindows,
    isLinux,
    isIOS,
    isAndroid,
    isMobile,

    isChrome,
    isSafari,
    isFirefox,
    isEdge,

    isTouch,

    shortcutSymbol,
    shortcutLabel,
    optionSymbol,
    shiftSymbol,
    altSymbol,
  };
}
