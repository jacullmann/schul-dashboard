<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { Router } from 'vue-router';
import { GROUP_IDS, mockSettings, regenerate } from './mock';

const props = defineProps<{ router: Router }>();

interface SpacingControl {
  key: string;
  label: string;
  /** The class the real component uses, before the value. */
  utility: string;
  defaultPx: number;
  max: number;
  negative?: boolean;
}

const GROUPS: { title: string; controls: SpacingControl[] }[] = [
  {
    title: 'Card',
    controls: [
      {
        key: 'card-p',
        label: 'Card padding',
        utility: 'p',
        defaultPx: 4,
        max: 32,
      },
      {
        key: 'list-gap',
        label: 'Space between cards',
        utility: 'gap',
        defaultPx: 0,
        max: 32,
      },
      {
        key: 'list-bleed',
        label: 'Bleed past page edge',
        utility: 'max-md:-mx',
        defaultPx: 16,
        max: 32,
        negative: true,
      },
    ],
  },
  {
    title: 'Content',
    controls: [
      { key: 'content-mt', label: 'Top', utility: 'mt', defaultPx: 8, max: 32 },
      {
        key: 'content-ml',
        label: 'Left (phone)',
        utility: 'ml',
        defaultPx: 12,
        max: 40,
      },
      {
        key: 'content-mb',
        label: 'Bottom',
        utility: 'mb',
        defaultPx: 4,
        max: 32,
      },
      {
        key: 'check-gap',
        label: 'Checkbox to title',
        utility: 'gap',
        defaultPx: 8,
        max: 32,
      },
      {
        key: 'title-gap',
        label: 'Title to details',
        utility: 'gap',
        defaultPx: 4,
        max: 24,
      },
      {
        key: 'row-gap',
        label: 'Content to pin button',
        utility: 'gap',
        defaultPx: 8,
        max: 32,
      },
    ],
  },
  {
    title: 'Pin button',
    controls: [
      { key: 'actions-mt', label: 'Top', utility: 'mt', defaultPx: 0, max: 24 },
      {
        key: 'actions-mr',
        label: 'Right',
        utility: 'mr',
        defaultPx: 0,
        max: 24,
      },
    ],
  },
  {
    title: 'Separator',
    controls: [
      {
        key: 'sep-ml',
        label: 'Left inset',
        utility: 'ml',
        defaultPx: 42,
        max: 80,
      },
      {
        key: 'sep-mr',
        label: 'Right inset',
        utility: 'mr',
        defaultPx: 16,
        max: 48,
      },
    ],
  },
];

const CONTROLS = GROUPS.flatMap((g) => g.controls);
const STORAGE_KEY = 'task-card-playground:spacing';

function loadSaved(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

const saved = loadSaved();
const values = reactive<Record<string, number>>(
  Object.fromEntries(
    CONTROLS.map((c) => [
      c.key,
      typeof saved[c.key] === 'number' ? saved[c.key]! : c.defaultPx,
    ]),
  ),
);

watch(
  values,
  () => {
    const root = document.documentElement.style;
    for (const c of CONTROLS)
      root.setProperty(`--pg-${c.key}`, `${values[c.key]}px`);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {
      // Without storage the values last until the page reloads.
    }
  },
  { immediate: true, deep: true },
);

const open = ref(false);

// Lets the end of the list scroll clear of the open sheet.
watch(open, (isOpen) => {
  document.body.style.paddingBottom = isOpen ? '52dvh' : '';
});
const section = ref<'spacing' | 'data'>('spacing');

function tailwindClass(c: SpacingControl, px: number): string {
  if (c.negative)
    return px === 0
      ? c.utility.replace('-mx', 'mx') + '-0'
      : `${c.utility}-${px / 4}`;
  return `${c.utility}-${px / 4}`;
}

const changes = computed(() =>
  CONTROLS.filter((c) => values[c.key] !== c.defaultPx).map((c) => ({
    label: `${GROUPS.find((g) => g.controls.includes(c))!.title} · ${c.label}`,
    from: tailwindClass(c, c.defaultPx),
    to: tailwindClass(c, values[c.key]!),
  })),
);

function step(c: SpacingControl, delta: number) {
  values[c.key] = Math.min(c.max, Math.max(0, values[c.key]! + delta));
}

function resetAll() {
  for (const c of CONTROLS) values[c.key] = c.defaultPx;
}

const copied = ref(false);
async function copyChanges() {
  const text = changes.value
    .map((ch) => `${ch.label}: ${ch.from} → ${ch.to}`)
    .join('\n');
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    // Some app views refuse the clipboard; the list stays selectable.
  }
}

let groupIndex = 0;
/** Opens the list in the other demo group, which mounts it fresh: data reloads and the entrance plays again. */
function reloadList() {
  groupIndex = (groupIndex + 1) % GROUP_IDS.length;
  void props.router.replace({
    name: 'group-tasks',
    params: { groupId: GROUP_IDS[groupIndex] },
  });
}

function applyData(reseed = false) {
  if (reseed) mockSettings.seed = Math.floor(Math.random() * 100000);
  regenerate();
  reloadList();
}
</script>

<template>
  <button
    v-if="!open"
    type="button"
    class="pg-fab fixed right-4 z-[1000] flex items-center gap-2 rounded-full bg-action px-4 h-11 text-sm font-medium text-on-action shadow-menu"
    @click="open = true"
  >
    <svg
      viewBox="0 0 24 24"
      class="size-4"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      aria-hidden="true"
    >
      <path
        d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"
      />
    </svg>
    Spacing
    <span
      v-if="changes.length"
      class="rounded-full bg-on-action/20 px-1.5 text-xs tabular-nums"
      >{{ changes.length }}</span
    >
  </button>

  <section
    v-else
    class="pg-sheet fixed inset-x-0 bottom-0 z-[1000] flex max-h-[52dvh] flex-col rounded-t-2xl border-t border-ghost-border bg-canvas text-on-ghost shadow-menu md:left-auto md:right-4 md:bottom-4 md:w-96 md:rounded-2xl md:border"
    aria-label="Task card spacing"
  >
    <header class="flex items-center gap-2 px-4 pt-3 pb-2">
      <div class="flex rounded-lg bg-ghost-hover p-0.5 text-sm">
        <button
          v-for="s in ['spacing', 'data'] as const"
          :key="s"
          type="button"
          class="rounded-md px-3 py-1 font-medium"
          :class="
            section === s
              ? 'bg-canvas text-on-ghost shadow-input'
              : 'text-on-ghost-muted'
          "
          @click="section = s"
        >
          {{ s === 'spacing' ? 'Spacing' : 'Mock data' }}
        </button>
      </div>
      <button
        type="button"
        class="ml-auto rounded-lg px-3 py-1.5 text-sm font-medium text-on-ghost-muted hover:bg-ghost-hover"
        @click="open = false"
      >
        Done
      </button>
    </header>

    <div
      class="overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <template v-if="section === 'spacing'">
        <div v-for="g in GROUPS" :key="g.title" class="py-2">
          <h4
            class="mb-1 text-xs! font-semibold! uppercase tracking-wider text-on-ghost-muted!"
          >
            {{ g.title }}
          </h4>
          <div
            v-for="c in g.controls"
            :key="c.key"
            class="grid grid-cols-[1fr_auto] items-center gap-x-3 py-1.5"
          >
            <label :for="`pg-${c.key}`" class="min-w-0 text-sm">
              {{ c.label }}
              <code
                class="ml-1 text-xs whitespace-nowrap"
                :class="
                  values[c.key] === c.defaultPx
                    ? 'text-on-ghost-subtle'
                    : 'text-accent'
                "
                >{{ tailwindClass(c, values[c.key]!) }}</code
              >
            </label>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="pg-step"
                :aria-label="`Decrease ${c.label}`"
                @click="step(c, -1)"
              >
                −
              </button>
              <span class="w-11 text-center text-sm tabular-nums"
                >{{ values[c.key] }}px</span
              >
              <button
                type="button"
                class="pg-step"
                :aria-label="`Increase ${c.label}`"
                @click="step(c, 1)"
              >
                +
              </button>
            </div>
            <input
              :id="`pg-${c.key}`"
              v-model.number="values[c.key]"
              type="range"
              min="0"
              :max="c.max"
              step="1"
              class="col-span-2 mt-1 w-full accent-accent"
            />
          </div>
        </div>

        <div class="border-t border-ghost-border py-3">
          <div class="flex items-center gap-2">
            <h4
              class="text-xs! font-semibold! uppercase tracking-wider text-on-ghost-muted!"
            >
              Changes
            </h4>
            <button
              v-if="changes.length"
              type="button"
              class="ml-auto rounded-lg px-2.5 py-1 text-sm font-medium hover:bg-ghost-hover"
              @click="copyChanges"
            >
              {{ copied ? 'Copied' : 'Copy' }}
            </button>
            <button
              type="button"
              class="rounded-lg px-2.5 py-1 text-sm font-medium text-danger hover:bg-ghost-hover disabled:opacity-40"
              :class="{ 'ml-auto': !changes.length }"
              :disabled="!changes.length"
              @click="resetAll"
            >
              Reset all
            </button>
          </div>
          <p v-if="!changes.length" class="my-2! text-sm">
            Everything matches the real task card.
          </p>
          <ul v-else class="mt-2 flex flex-col gap-1 text-sm select-text">
            <li
              v-for="ch in changes"
              :key="ch.label"
              class="flex flex-wrap gap-x-2"
            >
              <span class="text-on-ghost-muted">{{ ch.label }}</span>
              <code
                ><s class="text-on-ghost-subtle">{{ ch.from }}</s> →
                {{ ch.to }}</code
              >
            </li>
          </ul>
        </div>
      </template>

      <template v-else>
        <div class="flex flex-col gap-1 py-2">
          <div
            v-for="field in [
              { key: 'count', label: 'Upcoming tasks', min: 0, max: 30 },
              { key: 'pinned', label: 'Pinned', min: 0, max: 5 },
              { key: 'checked', label: 'Checked', min: 0, max: 10 },
              { key: 'latencyMs', label: 'Load time (ms)', min: 0, max: 2000 },
            ] as const"
            :key="field.key"
            class="grid grid-cols-[1fr_auto] items-center gap-x-3 py-1.5"
          >
            <label :for="`pg-data-${field.key}`" class="text-sm">{{
              field.label
            }}</label>
            <span class="text-sm tabular-nums">{{
              mockSettings[field.key]
            }}</span>
            <input
              :id="`pg-data-${field.key}`"
              v-model.number="mockSettings[field.key]"
              type="range"
              :min="field.min"
              :max="field.max"
              :step="field.key === 'latencyMs' ? 50 : 1"
              class="col-span-2 mt-1 w-full accent-accent"
              @change="field.key !== 'latencyMs' && applyData()"
            />
          </div>

          <label class="flex h-11 items-center justify-between text-sm">
            Long titles
            <input
              v-model="mockSettings.longTitles"
              type="checkbox"
              class="size-5 accent-accent"
              @change="applyData()"
            />
          </label>
          <label class="flex h-11 items-center justify-between text-sm">
            Dalton tab
            <input
              v-model="mockSettings.daltonEnabled"
              type="checkbox"
              class="size-5 accent-accent"
              @change="applyData()"
            />
          </label>

          <div class="mt-2 flex gap-2">
            <button type="button" class="pg-action" @click="applyData(true)">
              New tasks
            </button>
            <button type="button" class="pg-action" @click="reloadList">
              Replay loading
            </button>
          </div>
          <p class="my-2! text-xs">
            Example data, made up on each load. Checking, pinning and swiping
            work against it until the page reloads.
          </p>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.pg-fab {
  bottom: calc(var(--tab-bar-height, 0px) + 1rem);
}

.pg-step {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-ghost-border);
  font-size: 1.1rem;
  line-height: 1;
}

.pg-action {
  flex: 1;
  height: 2.5rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-ghost-border);
  font-size: 0.875rem;
  font-weight: 500;
}

.pg-step:active,
.pg-action:active {
  background: var(--color-ghost-hover);
}
</style>
