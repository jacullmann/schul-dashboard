<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useAnnouncements } from '@/modules/announcements/composables/useAnnouncements';
import { Ellipsis } from '@lucide/vue';

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
  <Transition name="fade-scale">
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
  </Transition>

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
        class="p-0 text-on-ghost text-sm flex items-center justify-center shadow-menu border-b cursor-pointer"
        :class="[
          colorFor(currentAnnouncement.color).replace('is-', 'bg-'),
          currentAnnouncement.color === 'danger'
            ? 'border-danger-highlight'
            : 'border-surface-border',
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
          class="text-xs mr-1 flex-shrink-0"
          :class="
            currentAnnouncement.color === 'danger'
              ? 'text-on-danger-muted'
              : 'text-on-ghost-muted'
          "
          v-if="announcements.length > 1"
        >
          {{ currentIndex + 1 }}/{{ announcements.length }}
        </span>

        <BaseTooltip content="More" placement="bottom">
          <BaseButton
            @click.stop="toggleMenu"
            variant="ghost"
            :on="currentAnnouncement.color === 'danger' ? 'danger' : 'ghost'"
            size="sm"
            :icon="Ellipsis"
            :touch="false"
            class="mr-1"
          />
        </BaseTooltip>
      </div>
    </div>
  </div>
</template>
