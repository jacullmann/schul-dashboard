<script setup lang="ts">
import { Check } from '@lucide/vue';

type TaskKind = 'homework' | 'dalton' | 'exam';

interface SpecimenTask {
  key: 'titration' | 'mechanics' | 'vocabulary' | 'essay';
  kind: TaskKind;
  subject: DemoSubject;
  due: DemoDay['key'];
  author: string;
  hasNote?: boolean;
}

const { t } = useI18n();

const filters = ['all', 'homework', 'dalton', 'exam'] as const;
const activeFilter = ref<(typeof filters)[number]>('all');
const done = ref(new Set<SpecimenTask['key']>(['vocabulary']));

const tasks: SpecimenTask[] = [
  { key: 'titration', kind: 'homework', subject: 'chemistry', due: 'wed', author: 'Anna' },
  {
    key: 'mechanics',
    kind: 'exam',
    subject: 'physics',
    due: 'fri',
    author: 'Jonas',
    hasNote: true,
  },
  { key: 'vocabulary', kind: 'dalton', subject: 'english', due: 'thu', author: 'Mila' },
  { key: 'essay', kind: 'homework', subject: 'german', due: 'thu', author: 'Anna' },
];

const visibleTasks = computed(() =>
  activeFilter.value === 'all' ? tasks : tasks.filter((task) => task.kind === activeFilter.value),
);

function toggleDone(key: SpecimenTask['key']) {
  const next = new Set(done.value);
  if (!next.delete(key)) next.add(key);
  done.value = next;
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div
      class="flex w-fit gap-0.5 rounded-full bg-ghost-hover p-1"
      role="group"
      :aria-label="t('home.tasks.filter_label')"
    >
      <button
        v-for="filter in filters"
        :key="filter"
        type="button"
        class="h-8 cursor-pointer rounded-full px-3.5 text-[0.8125rem] font-medium transition-colors"
        :class="
          activeFilter === filter
            ? 'bg-canvas text-on-ghost shadow-[0_1px_2px_oklch(0_0_0/12%)]'
            : 'text-on-ghost-muted hover:text-on-ghost'
        "
        :aria-pressed="activeFilter === filter"
        @click="activeFilter = filter"
      >
        {{ t(`home.tasks.kinds.${filter}`) }}
      </button>
    </div>

    <TransitionGroup
      tag="ul"
      class="relative flex flex-col border-t border-ghost-border"
      move-class="transition-transform duration-300 ease-out-quint"
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      leave-active-class="absolute inset-x-0 transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <li
        v-for="task in visibleTasks"
        :key="task.key"
        class="flex gap-3.5 border-b border-ghost-border bg-canvas py-4"
      >
        <button
          type="button"
          role="checkbox"
          :aria-checked="done.has(task.key)"
          :aria-label="t(`home.tasks.items.${task.key}.title`)"
          class="touch-target relative mt-px flex size-[1.125rem] shrink-0 cursor-pointer items-center justify-center rounded-[0.3125rem] border transition-colors"
          :class="
            done.has(task.key)
              ? 'border-action bg-action text-on-action'
              : 'border-on-ghost-subtle hover:border-on-ghost'
          "
          @click="toggleDone(task.key)"
        >
          <Check v-if="done.has(task.key)" :size="12" :stroke-width="3" aria-hidden="true" />
        </button>

        <div class="flex min-w-0 flex-col gap-1">
          <p
            class="text-[0.9375rem] leading-snug font-medium transition-colors"
            :class="done.has(task.key) && 'text-on-ghost-subtle line-through'"
          >
            {{ t(`home.tasks.items.${task.key}.title`) }}
          </p>
          <p class="text-[0.8125rem] text-on-ghost-muted">
            {{ t(`home.tasks.kinds.${task.kind}`) }} · {{ t(`home.subjects.${task.subject}`) }} ·
            {{ t('home.tasks.due', { day: t(`home.days.${task.due}`) }) }}
            <span class="text-on-ghost-subtle">
              · {{ t('home.tasks.added_by', { name: task.author }) }}
            </span>
          </p>
          <p
            v-if="task.hasNote"
            class="mt-1.5 font-serif text-[1.0625rem] text-on-ghost-muted italic"
          >
            {{ t(`home.tasks.items.${task.key}.note`) }}
          </p>
        </div>
      </li>
    </TransitionGroup>
  </div>
</template>
