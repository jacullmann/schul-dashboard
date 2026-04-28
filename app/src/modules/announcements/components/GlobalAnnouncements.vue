<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useAnnouncements } from '@/modules/announcements/composables/useAnnouncements';
import { Ellipsis, EllipsisVertical } from '@lucide/vue';

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
      class="p-1 text-on-ghost text-sub flex items-center justify-center shadow-menu border-b border-surface-border cursor-pointer"
      :class="colorFor(currentAnnouncement.color).replace('is-', 'bg-')"
      @click="nextAnnouncement"
    >
      <span class="whitespace-normal mx-2 flex-1 text-center">{{
        currentAnnouncement.content
      }}</span>

      <span
        class="text-xs text-on-ghost-muted flex-shrink-0"
        v-if="announcements.length > 1"
      >
        ({{ currentIndex + 1 }}/{{ announcements.length }})
      </span>

      <BaseTooltip content="More" placement="bottom">
        <BaseButton
          @click.stop="toggleMenu"
          variant="ghost"
          size="sm"
          :icon="EllipsisVertical"
          :touch="false"
        />
      </BaseTooltip>
    </div>
  </div>
</template>
