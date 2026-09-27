<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import { useModalStore } from '@/stores/modalStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { Plus, UsersRound } from '@lucide/vue';
import hw from '@/api/api';
import { useI18n } from 'vue-i18n';
import Avatar from '@/modules/auth/components/Avatar.vue';
import { entranceDelay } from '@/modules/tasks/utils/entrance';

const { t } = useI18n();

const router = useRouter();
const userStore = useUserStore();
const modalStore = useModalStore();
const { user } = storeToRefs(userStore);
const { contextGroupId, userGroups } = useAppAuth();

const loading = ref(false);
const navigatingGroupId = ref<string | null>(null);
const allGroups = ref<
  Array<{ id: string; name: string; memberCount: number; created_at: string }>
>([]);

const isSuperadmin = computed(() => user.value?.role === 'superadmin');

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 6) return 'groups.list.good_night';
  if (h < 12) return 'groups.list.good_morning';
  if (h < 18) return 'groups.list.good_day';
  return 'groups.list.good_evening';
});

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    admin: t('common.roles.admin'),
    moderator: t('common.roles.moderator'),
    user: t('common.roles.member'),
    superadmin: t('navigation.super_admin'),
  };
  return map[role] || role;
}

async function navigateToGroup(groupId: string) {
  if (navigatingGroupId.value) return;
  navigatingGroupId.value = groupId;

  try {
    await router.push({ name: 'group-dashboard', params: { groupId } });
  } catch (err) {
    console.error('Navigation error:', err);
  } finally {
    navigatingGroupId.value = null;
  }
}

async function loadAllGroups() {
  if (!isSuperadmin.value) return;
  loading.value = true;
  try {
    const { data } = await hw.get('/admin/groups');
    allGroups.value = data;
  } catch (err) {
    console.error('Failed to load groups:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadAllGroups();
});

/** The greeting, the prompt and its action, then the groups one by one. */
const PROMPT_ENTRANCE_ORDER = 1;
const GROUPS_HEADER_ENTRANCE_ORDER = 2;
const GROUPS_LIST_ENTRANCE_ORDER = 3;
</script>

<template>
  <div class="md:p-4">
    <section class="max-md:pt-4 max-md:px-4 mb-4 md:mb-8">
      <div class="flex justify-between items-start gap-4">
        <div>
          <h2 class="animate-enter">
            {{ t(greeting) }}
          </h2>
          <p
            class="text-base/relaxed text-on-ghost-muted m-0! animate-enter"
            :style="{ '--enter-delay': entranceDelay(PROMPT_ENTRANCE_ORDER) }"
          >
            {{
              userGroups.length
                ? t('groups.list.choose_group_prompt')
                : t('groups.list.join_or_create_prompt')
            }}
          </p>
        </div>

        <div
          v-if="userGroups.length > 0"
          class="relative animate-enter"
          :style="{ '--enter-delay': entranceDelay(PROMPT_ENTRANCE_ORDER) }"
        >
          <BaseTooltip
            :content="t('groups.list.tooltip.create_group')"
            placement="bottom"
          >
            <BaseButton
              variant="action"
              :icon="Plus"
              icon-classes="size-6"
              @click="modalStore.openCreateGroup()"
            />
          </BaseTooltip>
        </div>
      </div>
    </section>

    <section v-if="userGroups.length > 0" class="mb-9">
      <div
        class="flex items-center gap-2.5 mb-4 max-md:px-4 animate-enter"
        :style="{
          '--enter-delay': entranceDelay(GROUPS_HEADER_ENTRANCE_ORDER),
        }"
      >
        <h2 class="text-2xl font-bold text-on-ghost m-0">
          {{ t('groups.list.your_groups') }}
        </h2>
        <span
          class="text-on-ghost-muted bg-ghost-hover rounded-full text-sm font-semibold px-2.5 py-0.5"
          >{{ userGroups.length }}</span
        >
      </div>
      <div class="flex flex-col">
        <BaseList
          v-for="(group, index) in userGroups"
          :key="group.id"
          class="animate-enter"
          :style="{
            '--enter-delay': entranceDelay(GROUPS_LIST_ENTRANCE_ORDER + index),
          }"
          :active="group.id === contextGroupId"
          :separator="index !== userGroups.length - 1"
          :disabled="navigatingGroupId === group.id"
          :chevron="true"
          :indicator="false"
          @click="navigateToGroup(group.id)"
        >
          <template #icon>
            <Avatar :name="group.name" :picture="group.avatarUrl" :size="10" />
          </template>

          <template #label>
            <span class="flex items-center gap-1.5 overflow-hidden">
              <span class="font-semibold text-base text-on-ghost truncate">
                {{ group.name }}
              </span>
            </span>
            <span class="font-normal text-sm text-on-ghost-muted">
              {{ roleLabel(group.role) }}
            </span>
          </template>
        </BaseList>
      </div>
    </section>

    <section
      v-if="!isSuperadmin && userGroups.length === 0 && !loading"
      class="animate-enter"
      :style="{ '--enter-delay': entranceDelay(GROUPS_HEADER_ENTRANCE_ORDER) }"
    >
      <BaseEmptyState
        :icon="UsersRound"
        :primary-action="() => modalStore.openCreateGroup()"
      >
        <template #title>{{ t('groups.list.no_groups') }}</template>
        <template #message>{{ t('groups.list.join_group_text') }}</template>
        <template #primary-action-label>{{
          t('groups.list.create_group')
        }}</template>
      </BaseEmptyState>
    </section>

    <div
      v-if="loading"
      class="flex justify-center p-10 animate-enter"
      :style="{ '--enter-delay': entranceDelay(GROUPS_HEADER_ENTRANCE_ORDER) }"
    >
      <div
        class="w-7 h-7 border-2 border-ghost-border border-t-on-ghost rounded-full animate-spin"
      ></div>
    </div>
  </div>
</template>
