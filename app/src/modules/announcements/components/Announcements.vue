<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useAnnouncements } from '@/modules/announcements/composables/useAnnouncements';
import { Ellipsis } from '@lucide/vue';

const { t } = useI18n();

const { activeGroupId } = useAppAuth();

const { announcements, colorFor, checkAndNotifyUnread } = useAnnouncements();

const currentIndex = ref<number>(0);
const showMenu = ref<boolean>(false);

const currentAnnouncement = computed(
  () =>
    announcements.value[currentIndex.value] ?? {
      id: '',
      content: '',
      color: 'info',
    },
);

function toggleMenu() {
  showMenu.value = !showMenu.value;
}

function selectAnnouncement(index: number) {
  currentIndex.value = index;
  showMenu.value = false;
}

function nextAnnouncement() {
  if (announcements.value.length > 1) {
    currentIndex.value = (currentIndex.value + 1) % announcements.value.length;
  }
}

const announcementEl = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;

function updateAnnouncementHeight() {
  let height = '0px';
  if (
    announcements.value.length &&
    activeGroupId.value &&
    announcementEl.value
  ) {
    height = `${announcementEl.value.getBoundingClientRect().height}px`;
  }
  document.documentElement.style.setProperty('--announcement-height', height);
  window.dispatchEvent(new CustomEvent('announcement-height-changed'));
}

watch(announcements, updateAnnouncementHeight);

watch(activeGroupId, async (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) {
    currentIndex.value = 0;
    showMenu.value = false;
    await checkAndNotifyUnread();
  } else if (!newVal) {
    announcements.value = [];
    updateAnnouncementHeight();
  }
});

onMounted(async () => {
  if (activeGroupId.value) {
    await checkAndNotifyUnread();
  }

  if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => {
      updateAnnouncementHeight();
    });
    if (announcementEl.value) {
      resizeObserver.observe(announcementEl.value);
    }
  }

  updateAnnouncementHeight();
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
</script>

<template>
  <BaseModal :open="showMenu" @cancel="showMenu = false">
    <template #title>{{ t('announcements.all.title') }}</template>

    <template #content>
      <div class="max-h-[60vh] overflow-y-auto flex flex-col">
        <BaseButton
          v-for="(ann, index) in announcements"
          :key="ann.id"
          :active="index === currentIndex"
          :class="index === currentIndex ? 'bg-surface!' : ''"
          class="w-full"
          :touch="false"
          @click="selectAnnouncement(index)"
        >
          <div
            class="w-2 h-2 rounded-full flex-shrink-0"
            :class="colorFor(ann.color).replace('is-', 'bg-')"
          ></div>
          <span class="truncate">{{ ann.content }}</span>
        </BaseButton>
      </div>
    </template>
  </BaseModal>

  <div
    class="sticky top-[var(--header-height)] z-[100] grid transition-[grid-template-rows,opacity] duration-500 ease-out"
    :class="
      announcements.length
        ? 'grid-rows-[1fr] opacity-100'
        : 'grid-rows-[0fr] opacity-0 pointer-events-none'
    "
  >
    <div class="overflow-hidden min-h-0">
      <div
        ref="announcementEl"
        class="p-0 text-on-ghost text-sm flex items-center justify-center shadow-menu border-b cursor-pointer"
        :class="[
          colorFor(currentAnnouncement.color).replace('is-', 'bg-'),
          currentAnnouncement.color === 'danger'
            ? 'border-danger-highlight'
            : 'border-ghost-border',
        ]"
        @click="nextAnnouncement"
      >
        <span
          class="whitespace-normal mx-3 my-1 flex-1 text-center"
          :class="
            currentAnnouncement.color === 'danger'
              ? 'text-on-danger'
              : 'text-on-ghost'
          "
          >{{ currentAnnouncement.content }}</span
        >

        <span
          v-if="announcements.length > 1"
          class="text-xs mr-1 flex-shrink-0"
          :class="
            currentAnnouncement.color === 'danger'
              ? 'text-on-danger-muted'
              : 'text-on-ghost-muted'
          "
        >
          {{ currentIndex + 1 }}/{{ announcements.length }}
        </span>

        <BaseTooltip content="More" placement="bottom">
          <BaseButton
            variant="ghost"
            :on="currentAnnouncement.color === 'danger' ? 'danger' : 'ghost'"
            size="sm"
            :icon="Ellipsis"
            :touch="false"
            class="mr-1"
            @click.stop="toggleMenu"
          />
        </BaseTooltip>
      </div>
    </div>
  </div>
</template>
