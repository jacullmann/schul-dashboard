import { reactive, readonly } from 'vue';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
  dismissible: boolean;
}

interface ToastOptions {
  type?: ToastType;
  duration?: number;
  dismissible?: boolean;
}

let _nextId = 1;
const _timers = new Map<number, ReturnType<typeof setTimeout>>();
const state = reactive<{ toasts: Toast[] }>({ toasts: [] });

function add(message: string, durationOrOptions?: number | ToastOptions, opts?: ToastOptions): number {
  const id = _nextId++;
  let options: ToastOptions = {};
  if (typeof durationOrOptions === 'number') {
    options = { duration: durationOrOptions, ...opts };
  } else if (durationOrOptions) {
    options = durationOrOptions;
  }

  const { type = 'info', duration = 2500 + message.length * 50, dismissible = true } = options;
  state.toasts.push({ id, message, type, duration, dismissible });

  if (duration > 0) {
    _timers.set(id, setTimeout(() => dismiss(id), duration));
  }
  return id;
}

function dismiss(id: number): void {
  const index = state.toasts.findIndex((t) => t.id === id);
  if (index !== -1) state.toasts.splice(index, 1);
  const timer = _timers.get(id);
  if (timer !== undefined) { clearTimeout(timer); _timers.delete(id); }
}

function clear(): void {
  _timers.forEach((t) => clearTimeout(t));
  _timers.clear();
  state.toasts.splice(0);
}

type Opts = Omit<ToastOptions, 'type'>;
const mkHelper = (type: ToastType) => (msg: string, dOrO?: number | Opts, o?: Opts) => {
  const options = typeof dOrO === 'number' ? { duration: dOrO, ...o } : dOrO || {};
  return add(msg, { ...options, type });
};

export function useToast() {
  return {
    toasts: readonly(state.toasts),
    add, dismiss, clear,
    success: mkHelper('success'),
    error: mkHelper('error'),
    warning: mkHelper('warning'),
    info: mkHelper('info'),
  };
}
