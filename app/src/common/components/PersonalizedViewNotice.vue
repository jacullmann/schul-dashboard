<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ListFilter, X } from '@lucide/vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';

withDefaults(
  defineProps<{
    show: boolean;
    /** Off for a page shown again, which should not replay its entrance. */
    entrance?: boolean;
  }>(),
  { entrance: true },
);

const emit = defineEmits<{ dismiss: [] }>();

const { t } = useI18n();
const { activeGroupId } = useAppAuth();
</script>

<template>
  <Transition name="notice-reveal">
    <div v-if="show" class="notice-reveal">
      <div class="min-h-0">
        <div
          class="flex items-center gap-2 text-sm text-on-ghost-muted"
          :class="{ 'animate-enter': entrance }"
        >
          <ListFilter :size="16" class="shrink-0" aria-hidden="true" />
          <span class="m-0 flex flex-1 flex-wrap items-center gap-x-1.5">
            <span>{{ t('common.personalized_view.notice') }}</span>
            <BaseLink
              v-if="activeGroupId"
              inline
              :to="{
                name: 'group-admin',
                params: { groupId: activeGroupId, tab: 'courses' },
              }"
            >
              {{ t('common.personalized_view.edit_courses') }}
            </BaseLink>
          </span>
          <button
            type="button"
            class="relative shrink-0 rounded-full cursor-pointer text-on-ghost-muted hover:text-on-ghost transition-hover outline-none focus-visible:ring-2 focus-visible:ring-focus touch-target after:min-w-12 after:min-h-12"
            :aria-label="t('common.personalized_view.dismiss')"
            :title="t('common.personalized_view.dismiss')"
            @click="emit('dismiss')"
          >
            <X :size="16" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/*
 * The notice only appears once the data has loaded, while the content below is
 * already entering. Its row and the margins the page gives it open from zero,
 * so that content eases down instead of being shoved by a full line. The text
 * stays unclipped so its blurred, rising entrance is not cut off.
 */
.notice-reveal {
  display: grid;
  grid-template-rows: 1fr;
}

.notice-reveal-enter-active,
.notice-reveal-leave-active {
  transition:
    grid-template-rows 500ms var(--ease-settle),
    margin 500ms var(--ease-settle),
    opacity 150ms linear;
}

.notice-reveal-enter-from,
.notice-reveal-leave-to {
  grid-template-rows: 0fr;
  margin-block: 0;
}

.notice-reveal-leave-to {
  opacity: 0;
}
</style>
