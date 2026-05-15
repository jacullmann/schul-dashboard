import { reactive, readonly, ref } from 'vue';

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

interface ToastInternal extends Toast {
  remainingTime: number;
  timerId?: ReturnType<typeof setTimeout>;
  lastStartTime?: number;
}

let _nextId = 1;

const state = reactive<{ toasts: ToastInternal[] }>({
  toasts: [],
});

const isHovered = ref(false);

function setIsHovered(hovered: boolean) {
  isHovered.value = hovered;
  updateTimers();
}

function updateTimers() {
  const now = Date.now();

  // Clear all existing timers and update remaining time
  state.toasts.forEach((toast) => {
    if (toast.timerId) {
      clearTimeout(toast.timerId);
      toast.timerId = undefined;
      if (toast.lastStartTime) {
        toast.remainingTime -= (now - toast.lastStartTime);
        toast.lastStartTime = undefined;
      }
    }
  });

  if (isHovered.value) {
    return; // Do not start any timers while hovered
  }

  // Find the front-most toast (last in array) that is not persistent
  const frontToast = state.toasts[state.toasts.length - 1];
  if (frontToast && frontToast.duration > 0) {
    if (frontToast.remainingTime > 0) {
      frontToast.lastStartTime = now;
      frontToast.timerId = setTimeout(() => {
        dismiss(frontToast.id);
      }, frontToast.remainingTime);
    } else {
      dismiss(frontToast.id);
    }
  }
}

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

  const defaultDuration = 2500 + message.length * 50;

  const {
    type = 'info',
    duration = defaultDuration,
    dismissible = true,
  } = options;

  state.toasts.push({
    id,
    message,
    type,
    duration,
    dismissible,
    remainingTime: duration,
  });

  updateTimers();

  return id;
}

function dismiss(id: number): void {
  const index = state.toasts.findIndex((t) => t.id === id);
  if (index !== -1) {
    const toast = state.toasts[index];
    if (toast.timerId) {
      clearTimeout(toast.timerId);
    }
    state.toasts.splice(index, 1);
    updateTimers();
  }
}

function clear(): void {
  state.toasts.forEach((toast) => {
    if (toast.timerId) {
      clearTimeout(toast.timerId);
    }
  });
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
    toasts: readonly(state.toasts) as unknown as readonly Toast[],
    add,
    dismiss,
    clear,
    success,
    error,
    warning,
    info,
    setIsHovered,
  };
}
