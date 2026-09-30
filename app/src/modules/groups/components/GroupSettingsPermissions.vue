<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import InfoModal from '@/common/components/InfoModal.vue';
import hw from '../../../api/api';
import { groupPath } from '@/api/groupPath';
import { useGroupPageId } from '@/core/composables/useGroupPageId';
import { useToast } from '@/common/composables/useToast';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import type {
  PermissionKey,
  PermissionMatrix,
  PermissionRole,
} from '@/types/permissions';

const { t } = useI18n();

const props = defineProps<{
  canManage: boolean;
}>();

interface PermissionSection {
  category: 'general' | 'tasks' | 'chat' | 'info' | 'moderation';
  /** Mirrors `Permission::lowest_role`, which the server enforces. */
  permissions: { key: PermissionKey; lowestRole: PermissionRole }[];
}

const PERMISSION_SECTIONS: PermissionSection[] = [
  {
    category: 'general',
    permissions: [
      { key: 'edit_group_general', lowestRole: 'user' },
      { key: 'invite_members', lowestRole: 'user' },
      { key: 'edit_subjects_courses', lowestRole: 'moderator' },
      { key: 'edit_schedule', lowestRole: 'moderator' },
    ],
  },
  {
    category: 'tasks',
    permissions: [
      { key: 'create_items', lowestRole: 'user' },
      { key: 'upload_images', lowestRole: 'user' },
      { key: 'manage_notes', lowestRole: 'user' },
    ],
  },
  {
    category: 'chat',
    permissions: [{ key: 'send_messages', lowestRole: 'user' }],
  },
  {
    category: 'info',
    permissions: [
      { key: 'manage_schedule_changes', lowestRole: 'user' },
      { key: 'manage_announcements', lowestRole: 'moderator' },
    ],
  },
  {
    category: 'moderation',
    permissions: [
      { key: 'moderate_members', lowestRole: 'moderator' },
      { key: 'edit_other_content', lowestRole: 'moderator' },
      { key: 'delete_other_content', lowestRole: 'moderator' },
    ],
  },
];

const ROLES: { role: PermissionRole; label: string }[] = [
  { role: 'user', label: 'all' },
  { role: 'moderator', label: 'moderators' },
  { role: 'admin', label: 'admins' },
];

function roleOptions(lowestRole: PermissionRole) {
  const lowest = ROLES.findIndex(({ role }) => role === lowestRole);
  return ROLES.slice(lowest).map(({ role, label }) => ({
    label: t(`groups.settings.permissions.options.${label}`),
    value: role,
  }));
}

const toast = useToast();
const { checkAuthStatus, activeGroupPermissions } = useAppAuth();
const groupId = useGroupPageId();

const permissions = ref<PermissionMatrix | null>(null);
const loading = ref(true);
const saving = ref(false);

async function fetchPermissions() {
  // Only managers may call the admin endpoint; everyone else gets the
  // read-only matrix that the group status already carries.
  if (!props.canManage) {
    permissions.value = activeGroupPermissions.value;
    loading.value = false;
    return;
  }

  loading.value = true;
  try {
    const { data } = await hw.get<{ permissions: PermissionMatrix }>(
      groupPath(groupId, '/admin/permissions'),
    );
    permissions.value = data.permissions;
  } catch {
    toast.error(t('groups.settings.permissions.errors.load_failed'));
  } finally {
    loading.value = false;
  }
}

async function savePermission(key: PermissionKey, role: PermissionRole) {
  if (!props.canManage || !permissions.value) return;

  saving.value = true;
  const previousRole = permissions.value[key];
  permissions.value[key] = role;

  try {
    await hw.patch(groupPath(groupId, '/admin/permissions'), {
      permissions: { [key]: role },
    });
    toast.success(t('groups.settings.permissions.errors.update_success'));
    await checkAuthStatus();
  } catch {
    permissions.value[key] = previousRole;
    toast.error(t('groups.settings.permissions.errors.save_failed'));
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void fetchPermissions();
});
</script>

<template>
  <div>
    <PageHeader>
      {{ t('groups.settings.permissions.title') }}

      <template #info>
        <InfoModal
          :tooltip="t('groups.settings.permissions.info.tooltip')"
          :title="t('groups.settings.permissions.title')"
        >
          <h3>{{ t('groups.settings.permissions.info.headline') }}</h3>
        </InfoModal>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex flex-col justify-center items-center py-10">
      <BaseSpinner size="32px" />
      <span class="text-sm text-on-ghost-muted mt-2">{{
        t('groups.settings.permissions.list.loading')
      }}</span>
    </div>

    <div v-else-if="permissions" class="flex flex-col gap-4 relative">
      <div
        v-if="saving"
        class="absolute inset-0 bg-canvas/30 rounded-xl flex items-center justify-center z-10"
      >
        <BaseSpinner size="24px" />
      </div>

      <div
        v-if="!canManage"
        class="text-xs text-warning bg-warning/10 border border-warning/20 p-3 rounded-lg mb-2"
      >
        {{ t('groups.settings.permissions.list.admin_only_warning') }}
      </div>

      <section
        v-for="section in PERMISSION_SECTIONS"
        :key="section.category"
        class="flex flex-col gap-4"
      >
        <h3>
          {{ t(`groups.settings.permissions.categories.${section.category}`) }}
        </h3>

        <BaseRow
          v-for="{ key, lowestRole } in section.permissions"
          :key="key"
          justify="between"
          class="flex-nowrap!"
        >
          <div class="text-base text-on-ghost">
            {{ t(`groups.settings.permissions.items.${key}`) }}
          </div>

          <BaseSelect
            :form="false"
            :model-value="permissions[key]"
            :disabled="!canManage || saving"
            :options="roleOptions(lowestRole)"
            classes="w-38!"
            @update:model-value="savePermission(key, $event as PermissionRole)"
          />
        </BaseRow>
      </section>
    </div>
  </div>
</template>
