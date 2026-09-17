import { reactive, readonly, ref } from 'vue';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProgress {
  current: number;
  total: number;
}

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
  dismissible: boolean;
  progress?: ToastProgress;
}

interface ToastOptions {
  type?: ToastType;
  duration?: number;
  dismissible?: boolean;
  progress?: ToastProgress;
}

type ToastPatch = Partial<Omit<Toast, 'id'>>;

export interface ProgressToast {
  id: number;
  increment: (by?: number) => void;
  setTotal: (total: number) => void;
  settle: (message: string, options?: ToastOptions) => void;
  dismiss: () => void;
}

interface ToastInternal extends Toast {
  remainingTime: number;
  timerId?: ReturnType<typeof setTimeout>;
  lastStartTime?: number;
}

let _nextId = 1;

const defaultDurationFor = (message: string) => 2500 + message.length * 50;

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

  state.toasts.forEach((toast) => {
    if (toast.timerId) {
      clearTimeout(toast.timerId);
      toast.timerId = undefined;
      if (toast.lastStartTime) {
        toast.remainingTime -= now - toast.lastStartTime;
        toast.lastStartTime = undefined;
      }
    }
  });

  if (isHovered.value) {
    return;
  }

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

  const {
    type = 'info',
    duration = defaultDurationFor(message),
    dismissible = true,
    progress,
  } = options;

  state.toasts.push({
    id,
    message,
    type,
    duration,
    dismissible,
    progress,
    remainingTime: duration,
  });

  updateTimers();

  return id;
}

function update(id: number, patch: ToastPatch): void {
  const toast = state.toasts.find((t) => t.id === id);
  if (!toast) return;

  Object.assign(toast, patch);

  if (patch.duration !== undefined) {
    if (toast.timerId) {
      clearTimeout(toast.timerId);
      toast.timerId = undefined;
    }
    toast.lastStartTime = undefined;
    toast.remainingTime = patch.duration;
  }

  updateTimers();
}

/**
 * Creates a toast that renders a determinate progress bar instead of a message.
 * It stays until `settle()` turns it into a regular toast or `dismiss()` removes it.
 */
function progress(
  message: string,
  total: number,
  options: Omit<ToastOptions, 'progress' | 'duration'> = {},
): ProgressToast {
  const id = add(message, {
    type: 'info',
    dismissible: false,
    ...options,
    duration: 0,
    progress: { current: 0, total: Math.max(total, 0) },
  });

  const current = () =>
    state.toasts.find((t) => t.id === id)?.progress?.current ?? 0;
  const max = () => state.toasts.find((t) => t.id === id)?.progress?.total ?? 0;

  return {
    id,
    increment: (by = 1) =>
      update(id, {
        progress: { current: Math.min(current() + by, max()), total: max() },
      }),
    setTotal: (next) =>
      update(id, {
        progress: { current: Math.min(current(), next), total: next },
      }),
    settle: (settledMessage, settledOptions = {}) =>
      update(id, {
        message: settledMessage,
        progress: undefined,
        type: settledOptions.type ?? 'success',
        dismissible: settledOptions.dismissible ?? true,
        duration: settledOptions.duration ?? defaultDurationFor(settledMessage),
      }),
    dismiss: () => dismiss(id),
  };
}

function dismiss(id: number): void {
  const index = state.toasts.findIndex((t) => t.id === id);
  if (index === -1) return;

  const toast = state.toasts[index];
  if (toast?.timerId) {
    clearTimeout(toast.timerId);
  }
  state.toasts.splice(index, 1);
  updateTimers();
}

function clear(): void {
  state.toasts.forEach((toast) => {
    if (toast.timerId) {
      clearTimeout(toast.timerId);
    }
  });
  state.toasts.splice(0);
}

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
    update,
    progress,
    dismiss,
    clear,
    success,
    error,
    warning,
    info,
    setIsHovered,
  };
}
