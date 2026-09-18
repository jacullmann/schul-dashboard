<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { Calendar, ChevronLeft, ChevronRight } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue';

/** Value format matches `<input type="date">`: `YYYY-MM-DD`. */
const model = defineModel<string | null>();

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    id: string;
    min?: string;
    max?: string;
    disabled?: boolean;
  }>(),
  { min: undefined, max: undefined, disabled: false },
);

const { t, locale } = useI18n();

const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromKey = (key: string) => {
  const [y = 0, m = 1, d = 1] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const todayKey = toKey(new Date());
const isDisabled = (key: string) =>
  (!!props.min && key < props.min) || (!!props.max && key > props.max);

const isOpen = ref(false);
const cursor = ref(new Date()); // focused day, drives the visible month
const triggerRef = ref<any>(null);
const floatingRef = ref<any>(null);
const gridRef = ref<HTMLElement | null>(null);

const triggerEl = computed(() => triggerRef.value?.$el || null);
const menuEl = computed(() => floatingRef.value?.menuEl || null);

const { floatingStyles, isPositioned } = useFloating(triggerEl, menuEl, {
  placement: 'bottom-start',
  whileElementsMounted: autoUpdate,
  transform: false,
  middleware: [offset(4), flip(), shift({ padding: 8 })],
});

// Week start from locale (Mon for de, Sun for en-US); falls back to Monday.
const weekStart = computed(() => {
  const loc = new Intl.Locale(locale.value) as any;
  return ((loc.getWeekInfo?.() ?? loc.weekInfo)?.firstDay ?? 1) % 7;
});

const weekdays = computed(() => {
  const fmt = new Intl.DateTimeFormat(locale.value, { weekday: 'narrow' });
  // 2024-01-07 is a Sunday
  return Array.from({ length: 7 }, (_, i) =>
    fmt.format(new Date(2024, 0, 7 + weekStart.value + i)),
  );
});

const monthLabel = computed(() =>
  new Intl.DateTimeFormat(locale.value, {
    month: 'long',
    year: 'numeric',
  }).format(cursor.value),
);

const days = computed(() => {
  const first = new Date(
    cursor.value.getFullYear(),
    cursor.value.getMonth(),
    1,
  );
  const start = addDays(first, -((first.getDay() - weekStart.value + 7) % 7));
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(start, i);
    return {
      key: toKey(date),
      day: date.getDate(),
      outside: date.getMonth() !== first.getMonth(),
    };
  });
});

const cursorKey = computed(() => toKey(cursor.value));

const shortcuts = computed(() => {
  const rtf = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' });
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const now = new Date();
  return [
    { label: cap(rtf.format(1, 'day')), key: toKey(addDays(now, 1)) },
    { label: cap(rtf.format(1, 'week')), key: toKey(addDays(now, 7)) },
  ].filter((s) => !isDisabled(s.key));
});

const displayLabel = computed(() =>
  model.value
    ? new Intl.DateTimeFormat(locale.value, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year:
          fromKey(model.value).getFullYear() === new Date().getFullYear()
            ? undefined
            : 'numeric',
      }).format(fromKey(model.value))
    : t('common.selection.placeholder'),
);

const focusCursor = async () => {
  await nextTick();
  gridRef.value
    ?.querySelector<HTMLElement>(`[data-key="${cursorKey.value}"]`)
    ?.focus();
};

const toggle = () => {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    cursor.value = model.value ? fromKey(model.value) : new Date();
    void focusCursor();
  }
};

const close = () => {
  isOpen.value = false;
  triggerRef.value?.focus();
};

const select = (key: string) => {
  if (isDisabled(key)) return;
  model.value = key;
  close();
};

const shiftMonth = (n: number) => {
  const c = cursor.value;
  const target = new Date(c.getFullYear(), c.getMonth() + n, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0);
  target.setDate(Math.min(c.getDate(), lastDay.getDate()));
  cursor.value = target;
};

const keySteps: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

const onGridKeydown = (e: KeyboardEvent) => {
  const step = keySteps[e.key];
  if (step) cursor.value = addDays(cursor.value, step);
  else if (e.key === 'PageUp') shiftMonth(-1);
  else if (e.key === 'PageDown') shiftMonth(1);
  else return;
  // Keep BaseMenu's linear arrow navigation out of the grid
  e.preventDefault();
  e.stopPropagation();
  void focusCursor();
};
</script>

<template>
  <div class="relative">
    <BaseButton
      :id="id"
      ref="triggerRef"
      :disabled="disabled"
      variant="input"
      class="outline-none transition-focus"
      :class="isOpen ? 'border-focus! shadow-focus-ring!' : ''"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      :icon="Calendar"
      icon-placement="trailing"
      icon-classes="ml-auto shrink-0 text-on-ghost-muted"
      v-bind="$attrs"
      @pointerdown.stop
      @click="toggle"
    >
      <span class="truncate" :class="{ 'text-on-ghost-subtle': !model }">
        {{ displayLabel }}
      </span>
    </BaseButton>

    <Teleport to="body">
      <BaseMenu
        ref="floatingRef"
        :open="isOpen"
        :style="{
          ...floatingStyles,
          zIndex: 100002,
          opacity: isPositioned ? undefined : 0,
        }"
        @close="isOpen = false"
      >
        <!-- Stop Escape here so it closes only the picker, not a parent modal -->
        <div class="flex flex-col gap-2 p-1" @keydown.esc.stop="close">
          <div v-if="shortcuts.length" class="flex flex-wrap gap-1.5">
            <button
              v-for="s in shortcuts"
              :key="s.key"
              v-wave
              type="button"
              class="rounded-full border px-3 py-1 text-sm/5 font-medium whitespace-nowrap cursor-pointer transition-hover"
              :class="
                model === s.key
                  ? 'border-transparent bg-action text-on-action'
                  : 'border-ghost-border text-on-ghost-muted hover:bg-ghost-hover hover:text-on-ghost'
              "
              @click="select(s.key)"
            >
              {{ s.label }}
            </button>
          </div>

          <div class="flex items-center justify-between">
            <BaseButton
              :icon="ChevronLeft"
              :aria-label="t('common.date.previous_month')"
              @click="shiftMonth(-1)"
            />
            <span
              class="text-sm font-semibold text-on-ghost capitalize"
              aria-live="polite"
              >{{ monthLabel }}</span
            >
            <BaseButton
              :icon="ChevronRight"
              :aria-label="t('common.date.next_month')"
              @click="shiftMonth(1)"
            />
          </div>

          <div
            ref="gridRef"
            role="grid"
            :aria-label="monthLabel"
            class="grid grid-cols-7 text-center"
            @keydown="onGridKeydown"
          >
            <span
              v-for="(w, i) in weekdays"
              :key="i"
              class="pb-1 text-xs font-medium text-on-ghost-muted"
              aria-hidden="true"
              >{{ w }}</span
            >
            <button
              v-for="d in days"
              :key="d.key"
              type="button"
              role="gridcell"
              :data-key="d.key"
              :tabindex="d.key === cursorKey ? 0 : -1"
              :disabled="isDisabled(d.key)"
              :aria-selected="d.key === model"
              :aria-current="d.key === todayKey ? 'date' : undefined"
              class="relative mx-auto aspect-square size-10 rounded-full text-sm tabular-nums cursor-pointer outline-none transition-hover focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-30 disabled:cursor-not-allowed"
              :class="[
                d.key === model
                  ? 'bg-action text-on-action font-semibold'
                  : 'hover:bg-ghost-hover enabled:hover:text-on-ghost',
                d.key !== model &&
                  (d.outside ? 'text-on-ghost-subtle' : 'text-on-ghost'),
                d.key === todayKey && d.key !== model
                  ? 'font-bold after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:size-1 after:rounded-full after:bg-current'
                  : '',
              ]"
              @click="select(d.key)"
            >
              {{ d.day }}
            </button>
          </div>
        </div>
      </BaseMenu>
    </Teleport>
  </div>
</template>
