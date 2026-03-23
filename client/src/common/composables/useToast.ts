import { reactive, readonly } from 'vue';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number; // ms, 0 = persistent
  dismissible: boolean;
}

interface ToastOptions {
  type?: ToastType;
  duration?: number;
  dismissible?: boolean;
}

let _nextId = 1;
const _timers = new Map<number, ReturnType<typeof setTimeout>>();

const state = reactive<{ toasts: Toast[] }>({
  toasts: [],
});

function add(
  message: string,
  durationOrOptions?: number | ToastOptions,
  opts?: ToastOptions,
): number {
  const id = _nextId++;

  let options: ToastOptions = {};
  if (typeof durationOrOptions === 'number') {
    options = { duration: durationOrOptions, ...opts };
  } else if (durationOrOptions) {
    options = durationOrOptions;
  }

  // Best practice: Default duration based on message length for better UX/accessibility
  // Base time 2500ms + 50ms per character
  const defaultDuration = 2500 + message.length * 50;

  const {
    type = 'info',
    duration = defaultDuration,
    dismissible = true,
  } = options;

  state.toasts.push({ id, message, type, duration, dismissible });

  if (duration > 0) {
    _timers.set(
      id,
      setTimeout(() => dismiss(id), duration),
    );
  }

  return id;
}

function dismiss(id: number): void {
  const index = state.toasts.findIndex((t) => t.id === id);
  if (index !== -1) {
    state.toasts.splice(index, 1);
  }
  const timer = _timers.get(id);
  if (timer !== undefined) {
    clearTimeout(timer);
    _timers.delete(id);
  }
}

function clear(): void {
  _timers.forEach((t) => clearTimeout(t));
  _timers.clear();
  state.toasts.splice(0);
}

// Convenience helpers
type Opts = Omit<ToastOptions, 'type'>;

const success = (
  message: string,
  durationOrOpts?: number | Opts,
  opts?: Opts,
) => {
  const options =
    typeof durationOrOpts === 'number'
      ? { duration: durationOrOpts, ...opts }
      : durationOrOpts || {};
  return add(message, { ...options, type: 'success' });
};

const error = (
  message: string,
  durationOrOpts?: number | Opts,
  opts?: Opts,
) => {
  const options =
    typeof durationOrOpts === 'number'
      ? { duration: durationOrOpts, ...opts }
      : durationOrOpts || {};
  return add(message, { ...options, type: 'error' });
};

const warning = (
  message: string,
  durationOrOpts?: number | Opts,
  opts?: Opts,
) => {
  const options =
    typeof durationOrOpts === 'number'
      ? { duration: durationOrOpts, ...opts }
      : durationOrOpts || {};
  return add(message, { ...options, type: 'warning' });
};

const info = (message: string, durationOrOpts?: number | Opts, opts?: Opts) => {
  const options =
    typeof durationOrOpts === 'number'
      ? { duration: durationOrOpts, ...opts }
      : durationOrOpts || {};
  return add(message, { ...options, type: 'info' });
};

export function useToast() {
  return {
    toasts: readonly(state.toasts),
    add,
    dismiss,
    clear,
    success,
    error,
    warning,
    info,
  };
}
