<script setup lang="ts">
import { useRouter } from 'vue-router';
import { House, ListTodo, CalendarDays, Lock, ArrowLeft } from '@lucide/vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';

const router = useRouter();

const { activeGroupId } = useAppAuth();

const goBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push(
      activeGroupId.value
        ? `/groups/${activeGroupId.value}/tasks/all`
        : '/groups',
    );
  }
};
</script>

<template>
  <div class="p-4 max-w-[800px] my-0 mx-0 md:my-10 md:mx-auto">
    <div class="flex flex-col items-center text-center py-5 max-[500px]:py-2.5">
      <div
        class="font-display text-[96px] font-bold text-on-ghost leading-none mb-4 tracking-[-0.02em] max-md:text-[72px] max-[500px]:text-[64px] animate-fade-up"
      >
        404
      </div>
      <h1
        class="font-display text-[32px] font-semibold text-on-ghost m-0 mb-3 max-md:text-[24px] animate-fade-up"
        style="animation-delay: 0.05s; animation-fill-mode: both"
      >
        Page not found
      </h1>
      <p
        class="text-base text-on-ghost-muted m-0 mb-12 max-w-[500px] max-md:text-sm max-md:mb-8 animate-fade-up"
        style="animation-delay: 0.1s; animation-fill-mode: both"
      >
        The page you're looking for doesn't exist or isn't available.
      </p>

      <div
        class="w-full mb-8 animate-fade-up"
        style="animation-delay: 0.15s; animation-fill-mode: both"
      >
        <div
          class="grid w-full gap-3 grid-cols-[repeat(auto-fit,minmax(280px,1fr))] max-md:grid-cols-1"
        >
          <router-link
            :to="`/groups/${activeGroupId}/dashboard`"
            class="flex items-center gap-3 p-3 bg-surface border border-surface-border shadow-input rounded-xl no-underline transition-all duration-150 ease cursor-pointer hover:bg-surface-highlight"
          >
            <div
              class="shrink-0 w-10 h-10 flex items-center justify-center text-on-ghost-muted"
            >
              <House :size="24" />
            </div>
            <div class="flex-1 text-left">
              <div class="text-[15px] font-semibold text-on-ghost mb-[2px]">
                Homepage
              </div>
              <div class="text-[13px] text-on-ghost-muted">
                Overview of the group
              </div>
            </div>
          </router-link>

          <router-link
            :to="`/groups/${activeGroupId}/tasks/all`"
            class="flex items-center gap-3 p-3 bg-surface border border-surface-border shadow-input rounded-xl no-underline transition-all duration-150 ease cursor-pointer hover:bg-surface-highlight"
          >
            <div
              class="shrink-0 w-10 h-10 flex items-center justify-center text-on-ghost-muted"
            >
              <ListTodo :size="24" />
            </div>
            <div class="flex-1 text-left">
              <div class="text-[15px] font-semibold text-on-ghost mb-[2px]">
                Tasks
              </div>
              <div class="text-[13px] text-on-ghost-muted">
                Homework, assignments and exams
              </div>
            </div>
          </router-link>

          <router-link
            :to="`/groups/${activeGroupId}/schedule`"
            class="flex items-center gap-3 p-3 bg-surface border border-surface-border shadow-input rounded-xl no-underline transition-all duration-150 ease cursor-pointer hover:bg-surface-highlight"
          >
            <div
              class="shrink-0 w-10 h-10 flex items-center justify-center text-on-ghost-muted"
            >
              <CalendarDays :size="24" />
            </div>
            <div class="flex-1 text-left">
              <div class="text-[15px] font-semibold text-on-ghost mb-[2px]">
                Schedule
              </div>
              <div class="text-[13px] text-on-ghost-muted">
                All of your lessons
              </div>
            </div>
          </router-link>

          <router-link
            to="/private"
            class="flex items-center gap-3 p-3 bg-surface border border-surface-border shadow-input rounded-xl no-underline transition-all duration-150 ease cursor-pointer hover:bg-surface-highlight"
          >
            <div
              class="shrink-0 w-10 h-10 flex items-center justify-center text-on-ghost-muted"
            >
              <Lock :size="24" />
            </div>
            <div class="flex-1 text-left">
              <div class="text-[15px] font-semibold text-on-ghost mb-[2px]">
                Private Tasks
              </div>
              <div class="text-[13px] text-on-ghost-muted">
                Your private list of tasks
              </div>
            </div>
          </router-link>
        </div>
      </div>

      <div
        class="mt-4 animate-fade-up"
        style="animation-delay: 0.2s; animation-fill-mode: both"
      >
        <BaseButton variant="ghost" :icon="ArrowLeft" @click="goBack">
          Go back
        </BaseButton>
      </div>
    </div>
  </div>
</template>
