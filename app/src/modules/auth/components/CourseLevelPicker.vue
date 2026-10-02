<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { Subject } from '@/stores/subjectStore';
import type { NavItem } from '@/common/components/BaseTabs.vue';
import type { CourseLevel } from '@/modules/auth/utils/courseLevels';
import { subjectLabel } from '@/utils/subject-formatter';

const props = defineProps<{
  subjects: Subject[];
  options: ReadonlyMap<string, CourseLevel[]>;
}>();

const levels = defineModel<Record<string, CourseLevel | null>>({
  required: true,
});

const i18n = useI18n();
const { t } = i18n;
const te = i18n.te.bind(i18n);

const LEVEL_LABEL_KEYS: Record<CourseLevel, string> = {
  no: 'common.selection.no',
  yes: 'common.selection.yes',
  gk: 'groups.settings.subjects.course_types_short.gk',
  lk: 'groups.settings.subjects.course_types_short.lk',
};

const tabsOf = (subjectId: string): NavItem[] =>
  (props.options.get(subjectId) ?? []).map((level) => ({
    id: level,
    label: t(LEVEL_LABEL_KEYS[level]),
  }));

function choose(subjectId: string, id: string) {
  const level = props.options.get(subjectId)?.find((offered) => offered === id);
  if (level) levels.value = { ...levels.value, [subjectId]: level };
}
</script>

<template>
  <ul class="flex flex-col gap-3 m-0 p-0 list-none">
    <li
      v-for="subject in subjects"
      :key="subject.id"
      role="group"
      :aria-labelledby="`level-${subject.id}`"
      class="flex items-center justify-between gap-4"
    >
      <span :id="`level-${subject.id}`" class="min-w-0 truncate text-on-ghost">
        {{ subjectLabel(subject.name, t, te) }}
      </span>
      <div class="shrink-0">
        <BaseTabs
          :items="tabsOf(subject.id)"
          :active-id="levels[subject.id] ?? ''"
          @change="(level) => choose(subject.id, level)"
        />
      </div>
    </li>
  </ul>
</template>
