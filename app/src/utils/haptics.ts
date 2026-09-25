const DEFAULT_DURATION_MS = 10;

/**
 * Whether the browser exposes the Vibration API. Chrome on Android does, and
 * with it plays its own long-press feedback whenever the page consumes a hold.
 */
export const supportsVibration =
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

/**
 * Safari never shipped the Vibration API, but since iOS 18 it ticks the Taptic
 * Engine whenever an `<input type="checkbox" switch>` toggles, including when
 * its label is clicked from script. Checking `maxTouchPoints` keeps desktop
 * Safari, which knows the switch but has nothing to tick, out of it.
 */
const supportsSwitchHaptics =
  !supportsVibration &&
  typeof HTMLInputElement !== 'undefined' &&
  'switch' in HTMLInputElement.prototype &&
  navigator.maxTouchPoints > 0;

let switchLabel: HTMLLabelElement | undefined;

function createSwitchLabel() {
  const label = document.createElement('label');
  const input = document.createElement('input');

  input.type = 'checkbox';
  input.tabIndex = -1;
  input.setAttribute('switch', '');

  label.ariaHidden = 'true';
  label.style.display = 'none';
  label.append(input);

  // The toggle's clicks are plumbing: bubbling on, they would reach
  // document-level click handlers and read as a tap outside whatever is open.
  label.addEventListener('click', (event) => event.stopPropagation());

  document.body.append(label);

  return label;
}

function tickSwitch() {
  if (!switchLabel?.isConnected) switchLabel = createSwitchLabel();

  switchLabel.click();
}

/** A short haptic tick, or nothing where the device has no way to play one. */
export function haptic(duration = DEFAULT_DURATION_MS) {
  try {
    if (supportsVibration) navigator.vibrate(duration);
    else if (supportsSwitchHaptics) tickSwitch();
  } catch {
    // Feedback is a nicety; browsers are free to refuse it.
  }
}
