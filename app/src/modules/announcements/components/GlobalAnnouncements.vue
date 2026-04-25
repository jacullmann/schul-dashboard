<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useAnnouncements } from '@/modules/announcements/composables/useAnnouncements';
import { EllipsisVertical } from '@lucide/vue';

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

function updateAnnouncementHeight() {
  const height =
    announcements.value.length && activeGroupId.value ? '45px' : '0px';
  document.documentElement.style.setProperty('--announcement-height', height);
  window.dispatchEvent(new CustomEvent('announcement-height-changed'));
}

// Update layout height whenever the announcement list changes
watch(announcements, updateAnnouncementHeight);

// On group change: reload announcements and check for unseen ones
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
  updateAnnouncementHeight();
});
</script>

<template>
  <BaseModal v-if="showMenu" @cancel="showMenu = false">
    <template #title> Alle Ankündigungen </template>

    <template #content>
      <div class="max-h-[60vh] overflow-y-auto flex flex-col">
        <BaseButton
          v-for="(ann, index) in announcements"
          :key="ann.id"
          @click="selectAnnouncement(index)"
          :active="index === currentIndex"
          :class="index === currentIndex ? 'bg-surface!' : ''"
          class="w-full"
          :touch="false"
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
    class="sticky top-[var(--header-height)] z-[100]"
    v-if="announcements.length"
  >
    <div
      class="p-2 px-3 text-on-surface text-sub flex items-center justify-center shadow-menu border-b border-surface-border"
      :class="colorFor(currentAnnouncement.color).replace('is-', 'bg-')"
    >
      <div
        class="flex-1 flex items-center justify-center gap-2 cursor-pointer overflow-hidden"
        @click="nextAnnouncement"
      >
        <span class="whitespace-normal flex-1 text-center">{{
          currentAnnouncement.content
        }}</span>
        <span
          class="text-[12px] opacity-80 flex-shrink-0"
          v-if="announcements.length > 1"
        >
          ({{ currentIndex + 1 }}/{{ announcements.length }})
        </span>
      </div>

      <button
        class="bg-none border-none text-on-surface-muted cursor-pointer flex items-center justify-center flex-shrink-0 ml-3 hover:text-on-surface"
        @click.stop="toggleMenu"
      >
        <EllipsisVertical :size="16" />
      </button>
    </div>
  </div>
</template>
