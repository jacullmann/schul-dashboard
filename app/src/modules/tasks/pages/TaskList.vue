<script setup lang="ts">
import {
  computed,
  onActivated,
  onDeactivated,
  ref,
  useTemplateRef,
  watch,
} from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useIntersectionObserver } from '@vueuse/core';
import { useDismissibleNotice } from '@/common/composables/useDismissibleNotice';
import { Plus, ListFilter } from '@lucide/vue';

import { useTasks } from '@/modules/tasks/composables/useTasks';
import {
  holdPendingEntrances,
  vEntranceStart,
} from '@/common/composables/useSkeletonHandoff';
import { useCardEntrance } from '@/modules/tasks/composables/useCardEntrance';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';

import InfoModal from '@/common/components/InfoModal.vue';
import TaskSkeleton from '@/modules/tasks/components/TaskSkeleton.vue';
import TaskCard from '@/modules/tasks/components/TaskCard.vue';
import NotificationDot from '@/common/components/NotificationDot.vue';
import PersonalizedViewNotice from '@/common/components/PersonalizedViewNotice.vue';

import type { ItemType } from '@/modules/tasks/types';
import {
  entranceDelay,
  hasSettledEntrance,
} from '@/modules/tasks/utils/entrance';
import { collapseHeight } from '@/modules/tasks/utils/collapse';

const showFilterModal = ref(false);

const i18n = useI18n();
const t = i18n.t.bind(i18n);
const tm = i18n.tm.bind(i18n);

const { activeGroupDaltonEnabled } = useAppAuth();

const tabItems = computed(() => [
  { id: 'all', label: t('tasks.list.tabs.all') },
  { id: 'homework', label: t('tasks.list.tabs.homework') },
  ...(activeGroupDaltonEnabled.value
    ? [{ id: 'dalton', label: t('tasks.list.tabs.dalton') }]
    : []),
  { id: 'exam', label: t('tasks.list.tabs.exams') },
]);

const {
  user,
  loading,
  initialLoad,
  subjectFilter,
  showPersonalized,
  hiddenByCourses,
  showOldEntries,
  hideChecked,
  visibleCount,
  limitedItems,
  hasMoreItems,
  filteredItems,
  tab,
  openMenuId,
  showMore,
  onMenuAction,
  archiveItem,
  dismissedItems,
  useListTransitions,
  canEdit,
  canDelete,
  canManageNotes,
  canUploadImages,
  goTab,
  isChecked,
  toggleCheck,
  isPinned,
  triggerImageDrop,
  subjectOptions,
  resetFilters,
  openCreateForm,
} = useTasks();

const visibleItems = computed(() =>
  limitedItems.value.filter((item) => !dismissedItems.value.has(item.id)),
);

const hasActiveFilters = computed(
  () => subjectFilter.value !== '' || showOldEntries.value || hideChecked.value,
);

const personalizedNotice = useDismissibleNotice('personalizedTasks');

const showPersonalizedNotice = computed(
  () =>
    !personalizedNotice.isDismissed.value &&
    showPersonalized.value &&
    hiddenByCourses.value > 0 &&
    !initialLoad.value,
);

// The Dalton tab disappears with the setting, also for a link that opened it.
watch(
  [activeGroupDaltonEnabled, tab],
  ([daltonEnabled, activeTab]) => {
    if (!daltonEnabled && activeTab === 'dalton') goTab('all');
  },
  { immediate: true },
);

// Kept alive while a task is open, so the page is where it was left on return.
// Taken before leaving: once the task replaced the list, the page is too short
// to still be scrolled that far.
let scrollTop = 0;
onBeforeRouteLeave(() => {
  scrollTop = window.scrollY;
});
onActivated(() => {
  window.scrollTo({ top: scrollTop, behavior: 'instant' });
});

const showSkeleton = computed(() => loading.value && initialLoad.value);

/** The header, then the tabs and filter beside them, then the list. */
const TABS_ENTRANCE_ORDER = 1;
const FILTER_ENTRANCE_ORDER = 2;
const LIST_ENTRANCE_ORDER = 3;

// Stays in the flow while it folds away, so the rows below follow it up.
function collapseLeavingRow(el: Element, done: () => void) {
  if (!useListTransitions.value) done();
  else collapseHeight(el as HTMLElement, done);
}

// Behind the skeleton the list still sorts itself as checks and pins load.
const {
  entranceStart: cardEntranceStart,
  entranceStartOf: cardEntranceStartOf,
  isEntering: isCardEntering,
  entranceStyle: cardEntranceStyle,
  hasSettled: hasCardEntranceSettled,
  handleEntranceEnd: handleCardAnimationEnd,
  showWithoutEntrance: showCardsWithoutEntrance,
  settleAll: settleCardEntrance,
} = useCardEntrance(
  computed(() => visibleItems.value.map((item) => item.id)),
  showSkeleton,
  LIST_ENTRANCE_ORDER,
);

// Every task is loaded already, so the next page is only rendered once the
// list's end comes within a screen's height, before it is reached. While the
// first cards still cascade in, a page fills a tall screen and joins them.
const pageEnd = useTemplateRef<HTMLElement>('pageEnd');
useIntersectionObserver(
  pageEnd,
  ([entry]) => {
    if (!entry?.isIntersecting) return;
    const revealedIds = showMore().map((item) => item.id);
    if (hasCardEntranceSettled.value) showCardsWithoutEntrance(revealedIds);
  },
  { rootMargin: '0px 0px 100% 0px' },
);

const emptyStateEntered = ref(false);

function handleEmptyStateAnimationEnd(event: AnimationEvent) {
  if (hasSettledEntrance(event)) emptyStateEntered.value = true;
}

// Returning puts the page's nodes back into the document, which would restart
// their entrance, so it only plays the first time the page is shown, also for
// whatever had not settled yet when a task was opened.
const hasEntered = ref(false);
onDeactivated(() => {
  hasEntered.value = true;
  emptyStateEntered.value = true;
  settleCardEntrance();
});
</script>

<template>
  <div class="card">
    <div :class="{ 'animate-enter': !hasEntered }">
      <PageHeader>
        {{ t('tasks.list.title') }}
        <template #info>
          <InfoModal
            :tooltip="t('tasks.list.infopop.tooltip')"
            :title="t('tasks.list.title')"
          >
            <p>{{ t('tasks.list.infopop.description') }}</p>
            <template
              v-for="(section, index) in tm('tasks.list.infopop.sections')"
              :key="index"
            >
              <!-- eslint-disable-next-line vue/no-v-html -- bundled translation markup, not user input -->
              <h3 v-html="section.title"></h3>
              <!-- eslint-disable-next-line vue/no-v-html -- bundled translation markup, not user input -->
              <p v-html="section.text"></p>
            </template>
          </InfoModal>
        </template>

        <template #action>
          <BaseRow class="flex-nowrap!">
            <!-- Below md the filter row under the tabs would cost a whole line
                 for one button, so the button joins the header actions instead.
                 There is no room for its label there, and a tooltip never opens
                 on a touch device, so the active state has to read from the
                 button itself: it stays filled while a filter is on. -->
            <BaseTooltip
              :content="t('tasks.list.filter')"
              placement="bottom"
              class="md:hidden"
            >
              <BaseButton
                variant="ghost"
                :class="
                  hasActiveFilters ? 'bg-ghost-hover! text-on-ghost!' : ''
                "
                :aria-label="
                  hasActiveFilters
                    ? t('tasks.list.filter_active')
                    : t('tasks.list.filter')
                "
                :icon="ListFilter"
                @click="showFilterModal = true"
              />
            </BaseTooltip>

            <BaseTooltip :content="t('common.sidebar.task')" placement="bottom">
              <BaseButton
                variant="action"
                :aria-label="t('tasks.list.task_form.new_task')"
                :icon="Plus"
                icon-classes="size-6"
                @click="openCreateForm"
              />
            </BaseTooltip>
          </BaseRow>
        </template>
      </PageHeader>
    </div>

    <div class="flex gap-x-2 md:justify-between">
      <div
        class="min-w-0 grow"
        :class="{ 'animate-enter': !hasEntered }"
        :style="{ '--enter-delay': entranceDelay(TABS_ENTRANCE_ORDER) }"
      >
        <BaseTabs
          :items="tabItems"
          :active-id="tab"
          @change="(id) => goTab(id as ItemType)"
        />
      </div>

      <div
        class="max-md:hidden"
        :class="{ 'animate-enter': !hasEntered }"
        :style="{ '--enter-delay': entranceDelay(FILTER_ENTRANCE_ORDER) }"
      >
        <BaseRow>
          <BaseButton
            variant="ghost"
            :icon="ListFilter"
            @click="showFilterModal = true"
          >
            {{ t('tasks.list.filter') }}
            <NotificationDot v-if="hasActiveFilters" :size="1.5" class="ml-1" />
          </BaseButton>
        </BaseRow>
      </div>
    </div>

    <PersonalizedViewNotice
      :show="showPersonalizedNotice"
      :entrance="!hasEntered"
      class="mt-4 max-w-192 mx-auto"
      @dismiss="personalizedNotice.dismiss"
    />

    <!-- Tightens in step with the notice opening above it. -->
    <div
      class="relative flex flex-col gap-3 max-w-192 mx-auto transition-[margin-top] duration-500 ease-(--ease-settle)"
      :class="showPersonalizedNotice ? 'mt-3' : 'mt-8'"
    >
      <!-- Taken out of the flow while it fades, so the cards arriving in its
           place overlap it instead of waiting below it. -->
      <Transition
        leave-active-class="absolute inset-x-0 top-0 transition-opacity duration-300 ease-out"
        leave-to-class="opacity-0"
        @before-leave="holdPendingEntrances"
      >
        <TaskSkeleton
          v-if="showSkeleton"
          :entrance-order="LIST_ENTRANCE_ORDER"
          :entrance-start="cardEntranceStart"
        />
      </Transition>

      <TransitionGroup
        v-if="!showSkeleton"
        :css="useListTransitions"
        name="task-list"
        tag="div"
        class="flex flex-col relative max-md:-mx-4"
        @leave="collapseLeavingRow"
      >
        <!-- The fragment key prefixes both children's keys, so a separator
             folds away with the card below it and the next one takes over. -->
        <template v-for="(item, index) in visibleItems" :key="item.id">
          <div
            v-if="index > 0"
            v-entrance-start="cardEntranceStartOf(item.id)"
            class="task-separator border-b border-ghost-border ml-11.5 md:ml-10.5 mr-4"
            :class="{ 'animate-enter': isCardEntering(item.id) }"
            :style="cardEntranceStyle(item.id)"
          ></div>
          <TaskCard
            v-entrance-start="cardEntranceStartOf(item.id)"
            :class="{ 'animate-enter': isCardEntering(item.id) }"
            :style="cardEntranceStyle(item.id)"
            :item="item"
            :show-type="tab === 'all'"
            :is-archive-view="showOldEntries"
            :is-checked="isChecked(item.id)"
            :is-pinned="isPinned(item.id)"
            :is-menu-open="openMenuId === item.id"
            :can-check="!!user"
            :can-upload-images="canUploadImages"
            :can-edit="canEdit(item)"
            :can-add-note="canManageNotes && !item.editorNote"
            :can-delete="canDelete(item)"
            @toggle-check="toggleCheck(item)"
            @swipe="archiveItem(item)"
            @menu-action="(action) => onMenuAction(action, item)"
            @open-menu="openMenuId = item.id"
            @close-menu="openMenuId = null"
            @image-drop="(files) => triggerImageDrop(item, files)"
            @animationend="handleCardAnimationEnd($event, item.id)"
          />
        </template>
      </TransitionGroup>

      <BaseEmptyState
        v-if="!loading && !limitedItems.length"
        :class="{ 'animate-enter': !emptyStateEntered }"
        :primary-action="openCreateForm"
        :secondary-action="resetFilters"
        @animationend="handleEmptyStateAnimationEnd"
      >
        <template #title>{{ t('tasks.list.tasks.view.no_tasks') }}</template>
        <template #message>{{
          filteredItems.length
            ? t('tasks.list.tasks.view.no_tasks_in_view_message')
            : t('tasks.list.tasks.view.no_tasks_message')
        }}</template>
        <template #primary-action-label>{{
          t('tasks.list.create_task')
        }}</template>
        <template #secondary-action-label>{{
          t('tasks.list.reset_filters')
        }}</template>
      </BaseEmptyState>

      <!-- Replaced with every page: an observer only reports changes, and the
           end may still be in range after a page too short to reach past it.
           Out of the flow, so the list's gap does not open beneath it. -->
      <div
        v-if="hasMoreItems && !showSkeleton"
        ref="pageEnd"
        :key="visibleCount"
        aria-hidden="true"
        class="absolute inset-x-0 bottom-0"
      ></div>
    </div>

    <BaseModal :open="showFilterModal" sheet @cancel="showFilterModal = false">
      <template #title>
        {{ t('tasks.list.filter') }}
      </template>

      <template #content>
        <div class="flex flex-col -mx-4">
          <BaseList
            v-model="subjectFilter"
            select
            :options="subjectOptions"
            :title="t('tasks.list.task_form.subject')"
          >
            <template #label>
              {{ t('tasks.list.task_form.subject') }}
            </template>
          </BaseList>

          <BaseList v-model:checked="showOldEntries" toggle>
            <template #label>
              {{ t('tasks.list.archive.archive') }}
            </template>
          </BaseList>

          <BaseList v-model:checked="hideChecked" toggle :separator="false">
            <template #label>
              {{ t('tasks.list.hide_checked') }}
            </template>
          </BaseList>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.task-list-leave-active {
  animation: none !important;
}

.task-list-move {
  transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);
}
</style>
