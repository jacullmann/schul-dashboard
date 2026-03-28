import { ref } from 'vue';

/**
 * usePlatform composable
 *
 * Provides reactive platform and OS detection for UI adaptive components,
 * keyboard shortcut labels and browser-specific fixes.
 */
export function usePlatform() {
  const isBrowser = typeof window !== 'undefined';
  
  const nav = isBrowser ? window.navigator : ({} as Navigator);
  const ua = (isBrowser ? nav.userAgent : '').toLowerCase();
  const platform = (isBrowser ? (nav as any).platform || '' : '').toLowerCase();

  // OS Detection
  const isMac = platform.includes('mac') || ua.includes('macintosh');
  const isWindows = platform.includes('win') || ua.includes('windows');
  const isLinux = platform.includes('linux') || ua.includes('linux');
  
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const isMobile = isIOS || isAndroid || /mobile/.test(ua);

  // Browser Detection
  const isChrome = /chrome/.test(ua) && !/edge|edg|opr/.test(ua);
  const isSafari = /safari/.test(ua) && !/chrome/.test(ua);
  const isFirefox = /firefox/.test(ua);
  const isEdge = /edg/.test(ua) || /edge/.test(ua);

  // Input capabilities
  const isTouch = ref(isBrowser && ('ontouchstart' in window || nav.maxTouchPoints > 0));

  /**
   * Shortcut symbols for UI display (e.g., ⌘ vs Ctrl)
   */
  const shortcutSymbol = isMac ? '⌘' : 'Ctrl';
  const optionSymbol = isMac ? '⌥' : 'Alt';
  const shiftSymbol = isMac ? '⇧' : 'Shift';
  const altSymbol = isMac ? '⌥' : 'Alt';

  /**
   * Key label for full names (e.g., Command vs Control)
   */
  const shortcutLabel = isMac ? 'Command' : 'Control';

  return {
    // Environment
    isBrowser,
    
    // OS
    isMac,
    isWindows,
    isLinux,
    isIOS,
    isAndroid,
    isMobile,
    
    // Browser
    isChrome,
    isSafari,
    isFirefox,
    isEdge,
    
    // Capabilities
    isTouch,
    
    // UI Helpers
    shortcutSymbol,
    shortcutLabel,
    optionSymbol,
    shiftSymbol,
    altSymbol,
  };
}
