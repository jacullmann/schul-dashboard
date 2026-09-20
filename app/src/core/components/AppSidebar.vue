<script setup lang="ts">
import { useUserStore } from '@/stores/userStore';
import {
  PanelLeft,
  SquarePen,
  Megaphone,
  House,
  UsersRound,
  ListTodo,
  CalendarDays,
  Settings,
  Crown,
  Lock as LockIcon,
  Search,
  MessageCircle,
  Plus,
} from '@lucide/vue';
import AccountMenu from '@/modules/auth/components/AccountMenu.vue';
import { useSearchModal } from '@/core/composables/useSearchModal';
import { useTaskForm } from '@/core/composables/useTaskForm';
import { useAnnouncementForm } from '@/core/composables/useAnnouncementForm';
import { useModalStore } from '@/stores/modalStore';
import { storeToRefs } from 'pinia';
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useLogout } from '@/core/composables/useLogout';
import { useRouter } from 'vue-router';
import SidebarButton from '@/core/components/SidebarButton.vue';
import { useI18n } from 'vue-i18n';
import { useGroupAction } from '@/core/composables/useGroupAction';
import Avatar from '@/modules/auth/components/Avatar.vue';
import { MOBILE_BREAKPOINT } from '@/common/composables/useViewport';

const { t } = useI18n();
const performLogout = useLogout();

const userStore = useUserStore();
const { user, isGroupAdmin, isSuperadmin } = storeToRefs(userStore);

const { activeGroupId, userGroups } = useAppAuth();
const router = useRouter();

const modalStore = useModalStore();
const { sidebarExpanded: isExpanded } = storeToRefs(modalStore);
const { openSearch } = useSearchModal();
const { openTaskForm } = useTaskForm();
const { openAnnouncementForm } = useAnnouncementForm();
const { withGroup } = useGroupAction();

const isAnyGroupAdmin = computed(() => {
  if (isSuperadmin?.value) return true;
  if (isGroupAdmin?.value) return true;
  return userGroups.value?.some(
    (g) => g.role === 'admin' || g.role === 'moderator',
  );
});

function toggleExpanded() {
  modalStore.toggleSidebar();
}

function onPersonalizationChanged(value: boolean) {
  userStore.updateUser({ personalized: value });
}

async function logout() {
  await performLogout();
  collapseIfMobile();
}

function collapseIfMobile() {
  if (window.innerWidth < MOBILE_BREAKPOINT) {
    modalStore.setSidebarExpanded(false);
  }
}

function handleNavigation(path: string) {
  void router.push(path);
  collapseIfMobile();
}

function handleSearch() {
  openSearch();
  collapseIfMobile();
}

function handleTask() {
  collapseIfMobile();
  withGroup(() => {
    openTaskForm();
  });
}

function handleAnnouncement() {
  collapseIfMobile();
  withGroup(() => {
    openAnnouncementForm();
  });
}

function handleCreate() {
  collapseIfMobile();
  withGroup(() => {
    modalStore.openCreateGroup();
  });
}

/* Swipe to dismiss - the drawer's equivalent of BaseSheet's downward drag. */

const sidebarEl = ref<HTMLElement | null>(null);
const backdropEl = ref<HTMLElement | null>(null);

/** Distance in px past which a release dismisses the drawer whatever its speed. */
const DISMISS_THRESHOLD = 80;
/** Speed in px/ms that dismisses a short but decisive flick. */
const VELOCITY_THRESHOLD = 0.5;
/** Movement in px before the gesture commits to an axis. */
const AXIS_LOCK_THRESHOLD = 5;
/** Resistance on a pull towards the open side, which has nowhere left to go. */
const RUBBER_BAND = 0.1;
/** How far the backdrop dims across a full dismiss drag. */
const BACKDROP_FADE = 0.6;

let dragStartX = 0;
let dragStartY = 0;
let dragStartTime = 0;
let currentDragX = 0;
let isDragging = false;
let dragAxis: 'none' | 'x' | 'y' = 'none';
let dragHandled = false;
/** Whether the gesture has moved the drawer and owes it a settle. */
let hasDragStyles = false;
let settleTimer: ReturnType<typeof setTimeout> | null = null;

/** Suppresses the backdrop's own fade-out while the drag animates it instead. */
const isSwipeDismissing = ref(false);

/**
 * Drives the same `translate` property Tailwind's `-translate-x-full` sets, so
 * the inline offset and the class the drag hands back to never stack.
 */
function setSidebarStyle(translate: string, transition = 'none') {
  if (!sidebarEl.value) return;
  sidebarEl.value.style.translate = translate;
  sidebarEl.value.style.transition = transition;
}

function setBackdropStyle(opacity: string, transition = 'none') {
  if (!backdropEl.value) return;
  backdropEl.value.style.opacity = opacity;
  backdropEl.value.style.transition = transition;
}

function clearSidebarStyles() {
  if (!sidebarEl.value) return;
  sidebarEl.value.style.translate = '';
  sidebarEl.value.style.transition = '';
}

function clearBackdropStyles() {
  if (!backdropEl.value) return;
  backdropEl.value.style.opacity = '';
  backdropEl.value.style.transition = '';
}

function onSwipeStart(e: TouchEvent) {
  // Above the breakpoint the sidebar is a docked column, not a drawer.
  if (!isExpanded.value || window.innerWidth >= MOBILE_BREAKPOINT) return;
  if (e.touches.length !== 1) return;

  const touch = e.touches[0];
  if (!touch) return;

  if (settleTimer) {
    clearTimeout(settleTimer);
    settleTimer = null;
  }

  dragHandled = false;
  dragStartX = touch.clientX;
  dragStartY = touch.clientY;
  dragStartTime = Date.now();
  currentDragX = 0;
  isDragging = true;
  dragAxis = 'none';
  hasDragStyles = false;
}

function onSwipeMove(e: TouchEvent) {
  if (!isDragging) return;

  const touch = e.touches[0];
  if (!touch) return;

  const deltaX = touch.clientX - dragStartX;
  const deltaY = touch.clientY - dragStartY;

  if (dragAxis === 'none') {
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < AXIS_LOCK_THRESHOLD) {
      return;
    }
    // A vertical intent belongs to the group list's scroller.
    dragAxis = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y';
    if (dragAxis === 'y') {
      isDragging = false;
      return;
    }
  }

  if (deltaX > 0) {
    // Already fully open: follow the finger, but only just.
    currentDragX = 0;
    hasDragStyles = true;
    setSidebarStyle(`${deltaX * RUBBER_BAND}px`);
    setBackdropStyle('1');
    return;
  }

  if (e.cancelable) {
    e.preventDefault();
  }

  currentDragX = deltaX;
  hasDragStyles = true;
  const progress = Math.min(-deltaX / DISMISS_THRESHOLD, 1);
  setSidebarStyle(`${deltaX}px`);
  setBackdropStyle(String(1 - progress * BACKDROP_FADE));
}

function onSwipeEnd() {
  if (!isDragging) return;
  isDragging = false;

  // A tap never moved the drawer, so it owns no inline offset to settle.
  // Leaving one behind would outrank the collapsed class and hold the drawer
  // in place while the rest of the close animates.
  if (!hasDragStyles) return;

  if (Math.abs(currentDragX) > AXIS_LOCK_THRESHOLD) {
    dragHandled = true;
  }

  const distance = -currentDragX;
  const velocity = distance / Math.max(Date.now() - dragStartTime, 1);
  const shouldDismiss =
    distance > DISMISS_THRESHOLD ||
    (velocity > VELOCITY_THRESHOLD && distance > 20);

  if (!shouldDismiss) {
    setSidebarStyle('0px', 'translate 200ms cubic-bezier(0.22,1,0.36,1)');
    setBackdropStyle('1', 'opacity 200ms ease');
    settleTimer = setTimeout(() => {
      settleTimer = null;
      clearSidebarStyles();
      clearBackdropStyles();
      dragHandled = false;
    }, 220);
    return;
  }

  isSwipeDismissing.value = true;
  setSidebarStyle('-100%', 'translate 150ms cubic-bezier(0.32,0,0.67,1)');
  setBackdropStyle('0', 'opacity 150ms ease');

  settleTimer = setTimeout(() => {
    settleTimer = null;
    modalStore.setSidebarExpanded(false);
    // The collapsed classes park the drawer where the drag already left it,
    // so the inline offset can go once the DOM has caught up. The backdrop
    // keeps its faded-out style until it unmounts: restoring it here would
    // flash it back to full strength for the rest of its leave.
    void nextTick(() => {
      isSwipeDismissing.value = false;
      clearSidebarStyles();
      dragHandled = false;
    });
  }, 150);
}

function onBackdropClick() {
  // The tap that ends a drag must not count as a second dismiss.
  if (dragHandled) {
    dragHandled = false;
    return;
  }
  modalStore.setSidebarExpanded(false);
}

const sidebarScrollEl = ref<HTMLElement | null>(null);

const showTopFade = ref(false);
const showBottomFade = ref(false);

function updateFadeState(el: HTMLElement | null) {
  if (!el) {
    showTopFade.value = false;
    showBottomFade.value = false;
    return;
  }
  showTopFade.value = el.scrollTop > 1;
  showBottomFade.value = el.scrollHeight - el.scrollTop - el.clientHeight > 1;
}

let scrollTicking = false;

function handleScroll() {
  if (!scrollTicking) {
    requestAnimationFrame(() => {
      updateFadeState(sidebarScrollEl.value);
      scrollTicking = false;
    });
    scrollTicking = true;
  }
}

const fadeMask = computed(() => {
  const top = showTopFade.value;
  const bottom = showBottomFade.value;

  if (top && bottom) {
    return 'linear-gradient(to bottom, transparent 0px, black 32px, black calc(100% - 32px), transparent 100%)';
  } else if (top) {
    return 'linear-gradient(to bottom, transparent 0px, black 32px)';
  } else if (bottom) {
    return 'linear-gradient(to top, transparent 0px, black 32px)';
  }
  return 'none';
});

let resizeObserver: ResizeObserver | null = null;

function setupObserver() {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }

  const el = sidebarScrollEl.value;
  if (!el) {
    showTopFade.value = false;
    showBottomFade.value = false;
    return;
  }

  updateFadeState(el);

  resizeObserver = new ResizeObserver(() => {
    updateFadeState(sidebarScrollEl.value);
  });
  resizeObserver.observe(el);

  for (const child of el.children) {
    resizeObserver.observe(child);
  }
}

watch(sidebarScrollEl, () => {
  setupObserver();
});

watch(
  userGroups,
  () => {
    void nextTick(() => {
      setupObserver();
    });
  },
  { deep: true },
);

onMounted(() => {
  if (!userStore.initialized) {
    void userStore.fetchUser();
  }
  setupObserver();
});

function handleGroupClick(groupId: string) {
  const currentPath = router.currentRoute.value.path;
  if (
    activeGroupId.value &&
    currentPath.includes(`/groups/${activeGroupId.value}`)
  ) {
    handleNavigation(currentPath.replace(activeGroupId.value, groupId));
  } else {
    handleNavigation(`/groups/${groupId}/tasks`);
  }
}

onUnmounted(() => {
  document.body.style.overflow = '';
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  if (settleTimer) {
    clearTimeout(settleTimer);
  }
});
</script>

<template>
  <Transition
    appear
    enter-active-class="transition-opacity duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    :leave-active-class="
      isSwipeDismissing ? '' : 'transition-opacity duration-[280ms] ease-in'
    "
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isExpanded"
      ref="backdropEl"
      class="md:hidden fixed inset-0 bg-black/25 backdrop-blur-sm z-(--z-mobile-nav-backdrop) touch-pan-y"
      @click="onBackdropClick"
      @touchstart.passive="onSwipeStart"
      @touchmove="onSwipeMove"
      @touchend="onSwipeEnd"
      @touchcancel="onSwipeEnd"
    ></div>
  </Transition>

  <aside
    ref="sidebarEl"
    class="sidebar flex flex-col justify-between shrink-0 overflow-hidden h-dvh p-2.5 bg-surface border-r border-ghost-border z-(--z-mobile-nav) md:z-(--z-header) max-md:touch-pan-y"
    :class="[
      'md:sticky md:top-0 md:transition-[width]',
      isExpanded
        ? 'md:w-64 md:duration-[400ms] md:ease-[cubic-bezier(0.22,1,0.36,1)]'
        : 'md:w-[61px] md:duration-150 md:ease-[cubic-bezier(0.32,0,0.67,1)]',

      'max-md:fixed max-md:top-0 max-md:left-0 max-md:w-64 max-md:shadow-xl max-md:transition-transform',
      isExpanded
        ? 'max-md:translate-x-0 max-md:duration-[400ms] max-md:ease-[cubic-bezier(0.22,1,0.36,1)]'
        : 'max-md:-translate-x-full max-md:duration-150 max-md:ease-[cubic-bezier(0.32,0,0.67,1)]',
    ]"
    @touchstart.passive="onSwipeStart"
    @touchmove="onSwipeMove"
    @touchend="onSwipeEnd"
    @touchcancel="onSwipeEnd"
  >
    <div class="flex flex-col gap-4 w-full flex-1 min-h-0">
      <div class="hidden md:flex flex flex-col w-full">
        <SidebarButton
          :label="
            isExpanded
              ? t('common.sidebar.collapse')
              : t('common.sidebar.expand')
          "
          :shortcut="['ctrl', 'shift', 'd']"
          :expanded="isExpanded"
          :icon="PanelLeft"
          :page="false"
          @click="toggleExpanded"
        />
      </div>

      <div class="flex flex-col gap-0 w-full">
        <SidebarButton
          :label="t('common.sidebar.task')"
          :shortcut="['alt', 'n']"
          :expanded="isExpanded"
          :icon="SquarePen"
          :page="false"
          @click="handleTask"
        />

        <SidebarButton
          v-if="isAnyGroupAdmin"
          :label="t('common.sidebar.announcement')"
          :shortcut="['alt', 'a']"
          :expanded="isExpanded"
          :icon="Megaphone"
          :page="false"
          @click="handleAnnouncement"
        />

        <SidebarButton
          :label="t('common.sidebar.search')"
          :shortcut="['ctrl', 'k']"
          :expanded="isExpanded"
          :icon="Search"
          :page="false"
          @click="handleSearch"
        />
      </div>

      <div class="flex flex-col gap-0 w-full">
        <SidebarButton
          :label="t('common.sidebar.dashboard')"
          :expanded="isExpanded"
          :active="$route.path.startsWith(`/groups/${activeGroupId}/dashboard`)"
          :icon="House"
          :page="true"
          @click="
            withGroup(() =>
              handleNavigation(`/groups/${activeGroupId}/dashboard`),
            )
          "
        />

        <SidebarButton
          :label="t('common.sidebar.tasks')"
          :expanded="isExpanded"
          :active="$route.path.startsWith(`/groups/${activeGroupId}/tasks`)"
          :icon="ListTodo"
          :page="true"
          @click="
            withGroup(() => handleNavigation(`/groups/${activeGroupId}/tasks`))
          "
        />

        <SidebarButton
          :label="t('common.sidebar.schedule')"
          :expanded="isExpanded"
          :active="$route.path.startsWith(`/groups/${activeGroupId}/schedule`)"
          :icon="CalendarDays"
          :page="true"
          @click="
            withGroup(() =>
              handleNavigation(`/groups/${activeGroupId}/schedule`),
            )
          "
        />

        <SidebarButton
          :label="t('common.sidebar.messages')"
          :expanded="isExpanded"
          :active="$route.path.startsWith(`/groups/${activeGroupId}/messages`)"
          :icon="MessageCircle"
          :page="true"
          @click="
            withGroup(() =>
              handleNavigation(`/groups/${activeGroupId}/messages`),
            )
          "
        />

        <SidebarButton
          v-if="activeGroupId"
          :label="t('common.sidebar.admin')"
          :expanded="isExpanded"
          :active="$route.path.startsWith(`/groups/${activeGroupId}/settings`)"
          :icon="Settings"
          :page="true"
          @click="
            withGroup(() =>
              handleNavigation(`/groups/${activeGroupId}/settings`),
            )
          "
        />

        <SidebarButton
          v-if="isSuperadmin"
          :label="t('common.roles.superadmin')"
          :expanded="isExpanded"
          :active="$route.path.startsWith('/admin')"
          :icon="Crown"
          :page="true"
          @click="withGroup(() => handleNavigation('/admin'))"
        />
      </div>

      <div class="flex flex-col gap-0 w-full">
        <SidebarButton
          :label="t('common.sidebar.groups')"
          :expanded="isExpanded"
          :active="['/groups', '/groups/'].includes($route.path)"
          :icon="UsersRound"
          :page="true"
          @click="handleNavigation('/groups')"
        />

        <SidebarButton
          :label="t('common.sidebar.private')"
          :expanded="isExpanded"
          :active="$route.path.startsWith('/private')"
          :icon="LockIcon"
          :page="true"
          @click="handleNavigation('/private')"
        />
      </div>

      <BaseMenuDivider />

      <div
        ref="sidebarScrollEl"
        class="flex flex-col gap-2 -mx-2.5 px-2.5 overflow-y-auto overflow-x-hidden flex-1 list-fade"
        :style="{ '--menu-fade-mask': fadeMask }"
        @scroll="handleScroll"
      >
        <BaseTooltip
          v-for="(group, index) in userGroups"
          :key="index"
          :content="group.name"
          placement="right"
        >
          <button
            v-wave
            :class="activeGroupId === group.id ? 'active' : ''"
            class="group relative gap-0 items-center flex p-1 text-on-ghost-muted hover:text-on-ghost rounded-full bg-transparent hover:bg-surface-hover transition-hover cursor-pointer outline-none w-full touch-target after:min-w-[calc(100%+24px)] after:min-h-12"
            @click="handleGroupClick(group.id)"
          >
            <span
              class="absolute transition-[max-height,width,top,opacity] duration-200 -left-2.5 group-[.active]:top-0 group-hover:top-[25%] top-[45%] bottom-0 w-0.5 opacity-0 group-[.active]:w-1 group-hover:w-1 group-[.active]:opacity-100 group-hover:opacity-100 group-[.active]:max-h-full group-hover:max-h-[50%] max-h-[10%] bg-action rounded-r-full"
            ></span>
            <Avatar
              :name="group.name"
              :picture="group.avatarUrl"
              :size="8"
              :unread="group.hasUnreadContent"
            />
            <span
              class="transition-[max-width,opacity,margin-left] text-sm/5 font-medium whitespace-nowrap overflow-hidden"
              :class="
                isExpanded
                  ? 'max-w-40 opacity-100 ml-2 duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
                  : 'max-w-0 opacity-0 ml-0 duration-150 ease-[cubic-bezier(0.32,0,0.67,1)]'
              "
            >
              {{ group.name }}
            </span>
          </button>
        </BaseTooltip>

        <SidebarButton
          :label="t('common.sidebar.create')"
          :expanded="isExpanded"
          :icon="Plus"
          :page="false"
          @click="handleCreate"
        />
      </div>
    </div>

    <AccountMenu
      v-if="user"
      :email="user.email"
      :user-data="user"
      :expanded="isExpanded"
      @logout="logout"
      @personalization-changed="onPersonalizationChanged"
      @click="collapseIfMobile"
    />
  </aside>
</template>

<style scoped>
.fade-links-enter-active,
.fade-links-leave-active {
  transition: opacity 0.15s ease;
}
.fade-links-enter-from,
.fade-links-leave-to {
  opacity: 0;
}

.list-fade {
  -webkit-mask-image: var(--menu-fade-mask, none);
  mask-image: var(--menu-fade-mask, none);
}
</style>
