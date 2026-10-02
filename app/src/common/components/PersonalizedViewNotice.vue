<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ListFilter, X } from '@lucide/vue';
import InfoModal from '@/common/components/InfoModal.vue';

withDefaults(
  defineProps<{
    show: boolean;
    /** Off for a page shown again, which should not replay its entrance. */
    entrance?: boolean;
  }>(),
  { entrance: true },
);

const emit = defineEmits<{ dismiss: [] }>();

const i18n = useI18n();
const t = i18n.t.bind(i18n);
const tm = i18n.tm.bind(i18n);
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
            <InfoModal
              :tooltip="t('common.personalized_view.info.tooltip')"
              :title="t('common.personalized_view.info.title')"
              :icon-size="16"
            >
              <p>{{ t('common.personalized_view.info.description') }}</p>
              <template
                v-for="(section, index) in tm(
                  'common.personalized_view.info.sections',
                )"
                :key="index"
              >
                <h3>{{ section.title }}</h3>
                <p>{{ section.text }}</p>
              </template>
            </InfoModal>
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
