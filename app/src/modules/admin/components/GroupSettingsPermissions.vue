<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import InfoModal from '@/common/components/InfoModal.vue';
import hw from '../../../api/api';
import { useToast } from '@/common/composables/useToast';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';

const { t } = useI18n();

const props = defineProps<{
  isAdmin: boolean;
}>();

const toast = useToast();
const { checkAuthStatus } = useAppAuth();

const permissions = ref<Record<string, string>>({
  edit_group_general: 'moderator',
  edit_subjects_courses: 'admin',
  edit_schedule: 'admin',
  create_items: 'user',
  upload_images: 'user',
  manage_notes: 'moderator',
  send_messages: 'user',
  manage_schedule_changes: 'moderator',
  manage_announcements: 'moderator',
  moderate_members: 'moderator',
  delete_other_content: 'moderator',
  invite_members: 'user',
});

const loading = ref(true);
const saving = ref(false);

async function fetchPermissions() {
  loading.value = true;
  try {
    const { data } = await hw.get('/group-admin/permissions');
    if (data.permissions) {
      permissions.value = {
        ...permissions.value,
        ...data.permissions,
      };
    }
  } catch (err) {
    toast.error(t('admin.permissions.errors.load_failed'));
  } finally {
    loading.value = false;
  }
}

async function savePermission(key: string, value: string) {
  if (!props.isAdmin) return;

  saving.value = true;
  const originalValue = permissions.value[key];
  permissions.value[key] = value;

  try {
    const { data } = await hw.patch('/group-admin/permissions', {
      permissions: permissions.value,
    });
    if (data.ok) {
      toast.success(t('admin.permissions.errors.update_success'));
      await checkAuthStatus();
    } else {
      throw new Error();
    }
  } catch (err) {
    permissions.value[key] = originalValue;
    toast.error(t('admin.permissions.errors.save_failed'));
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void fetchPermissions();
});
</script>

<template>
  <div class="animate-fade-up">
    <PageHeader>
      {{ t('admin.permissions.title') }}

      <template #info>
        <InfoModal
          tooltip="t('admin.permissions.info.tooltip')"
          title="t('admin.permissions.title')"
        >
          <h3>{{ t('admin.permissions.info.headline') }}</h3>
        </InfoModal>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex flex-col justify-center items-center py-10">
      <BaseSpinner size="32px" />
      <span class="text-sm text-on-ghost-muted mt-2">{{
        t('admin.permissions.list.loading')
      }}</span>
    </div>

    <div v-else class="flex flex-col gap-4 relative">
      <div
        v-if="saving"
        class="absolute inset-0 bg-canvas/30 rounded-xl flex items-center justify-center z-10"
      >
        <BaseSpinner size="24px" />
      </div>

      <div
        v-if="!isAdmin"
        class="text-xs text-warning bg-warning/10 border border-warning/20 p-3 rounded-lg mb-2"
      >
        {{ t('admin.permissions.list.admin_only_warning') }}
      </div>

      <h3>{{ t('admin.permissions.categories.general') }}</h3>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost">
          {{ t('admin.permissions.items.edit_group_general') }}
        </div>

        <BaseSelect
          :form="false"
          :model-value="permissions.edit_group_general"
          :disabled="!isAdmin || saving"
          :options="[
            { label: t('admin.permissions.options.all'), value: 'user' },
            {
              label: t('admin.permissions.options.moderators'),
              value: 'moderator',
            },
            { label: t('admin.permissions.options.admins'), value: 'admin' },
          ]"
          classes="w-38!"
          @update:model-value="savePermission('edit_group_general', $event)"
        />
      </BaseRow>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost">
          {{ t('admin.permissions.items.invite_members') }}
        </div>

        <BaseSelect
          :form="false"
          :model-value="permissions.invite_members"
          :disabled="!isAdmin || saving"
          :options="[
            { label: t('admin.permissions.options.all'), value: 'user' },
            {
              label: t('admin.permissions.options.moderators'),
              value: 'moderator',
            },
            { label: t('admin.permissions.options.admins'), value: 'admin' },
          ]"
          classes="w-38!"
          @update:model-value="savePermission('invite_members', $event)"
        />
      </BaseRow>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost">
          {{ t('admin.permissions.items.edit_subjects_courses') }}
        </div>

        <BaseSelect
          :form="false"
          :model-value="permissions.edit_subjects_courses"
          :disabled="!isAdmin || saving"
          :options="[
            { label: 'Moderatoren', value: 'moderator' },
            { label: 'Admins', value: 'admin' },
          ]"
          classes="w-38!"
          @update:model-value="savePermission('edit_subjects_courses', $event)"
        />
      </BaseRow>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost">
          {{ t('admin.permissions.items.edit_schedule') }}
        </div>

        <BaseSelect
          :form="false"
          :model-value="permissions.edit_schedule"
          :disabled="!isAdmin || saving"
          :options="[
            { label: 'Moderatoren', value: 'moderator' },
            { label: 'Admins', value: 'admin' },
          ]"
          classes="w-38!"
          @update:model-value="savePermission('edit_schedule', $event)"
        />
      </BaseRow>

      <h3>{{ t('admin.permissions.categories.tasks') }}</h3>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost">
          {{ t('admin.permissions.items.create_items') }}
        </div>

        <BaseSelect
          :form="false"
          :model-value="permissions.create_items"
          :disabled="!isAdmin || saving"
          :options="[
            { label: 'Alle', value: 'user' },
            { label: 'Moderatoren', value: 'moderator' },
            { label: 'Admins', value: 'admin' },
          ]"
          classes="w-38!"
          @update:model-value="savePermission('create_items', $event)"
        />
      </BaseRow>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost">
          {{ t('admin.permissions.items.upload_images') }}
        </div>

        <BaseSelect
          :form="false"
          :model-value="permissions.upload_images"
          :disabled="!isAdmin || saving"
          :options="[
            { label: 'Alle', value: 'user' },
            { label: 'Moderatoren', value: 'moderator' },
            { label: 'Admins', value: 'admin' },
          ]"
          classes="w-38!"
          @update:model-value="savePermission('upload_images', $event)"
        />
      </BaseRow>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost">
          {{ t('admin.permissions.items.manage_notes') }}
        </div>

        <BaseSelect
          :form="false"
          :model-value="permissions.manage_notes"
          :disabled="!isAdmin || saving"
          :options="[
            { label: 'Alle', value: 'user' },
            { label: 'Moderatoren', value: 'moderator' },
            { label: 'Admins', value: 'admin' },
          ]"
          classes="w-38!"
          @update:model-value="savePermission('manage_notes', $event)"
        />
      </BaseRow>

      <h3>{{ t('admin.permissions.categories.chat') }}</h3>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost">
          {{ t('admin.permissions.items.send_messages') }}
        </div>

        <BaseSelect
          :form="false"
          :model-value="permissions.send_messages"
          :disabled="!isAdmin || saving"
          :options="[
            { label: 'Alle', value: 'user' },
            { label: 'Moderatoren', value: 'moderator' },
            { label: 'Admins', value: 'admin' },
          ]"
          classes="w-38!"
          @update:model-value="savePermission('send_messages', $event)"
        />
      </BaseRow>

      <h3>{{ t('admin.permissions.categories.info') }}</h3>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost hyphens-auto">
          {{ t('admin.permissions.items.manage_schedule_changes') }}
        </div>

        <BaseSelect
          :form="false"
          :model-value="permissions.manage_schedule_changes"
          :disabled="!isAdmin || saving"
          :options="[
            { label: 'Alle', value: 'user' },
            { label: 'Moderatoren', value: 'moderator' },
            { label: 'Admins', value: 'admin' },
          ]"
          classes="w-38!"
          @update:model-value="
            savePermission('manage_schedule_changes', $event)
          "
        />
      </BaseRow>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost">
          {{ t('admin.permissions.items.manage_announcements') }}
        </div>

        <BaseSelect
          :form="false"
          :model-value="permissions.manage_announcements"
          :disabled="!isAdmin || saving"
          :options="[
            { label: 'Moderatoren', value: 'moderator' },
            { label: 'Admins', value: 'admin' },
          ]"
          classes="w-38!"
          @update:model-value="savePermission('manage_announcements', $event)"
        />
      </BaseRow>

      <h3>{{ t('admin.permissions.categories.moderation') }}</h3>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost">
          {{ t('admin.permissions.items.moderate_members') }}
        </div>

        <BaseSelect
          :form="false"
          :model-value="permissions.moderate_members"
          :disabled="!isAdmin || saving"
          :options="[
            { label: 'Moderatoren', value: 'moderator' },
            { label: 'Admins', value: 'admin' },
          ]"
          classes="w-38!"
          @update:model-value="savePermission('moderate_members', $event)"
        />
      </BaseRow>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost">
          {{ t('admin.permissions.items.delete_other_content') }}
        </div>

        <BaseSelect
          :form="false"
          :model-value="permissions.delete_other_content"
          :disabled="!isAdmin || saving"
          :options="[
            { label: 'Moderatoren', value: 'moderator' },
            { label: 'Admins', value: 'admin' },
          ]"
          classes="w-38!"
          @update:model-value="savePermission('delete_other_content', $event)"
        />
      </BaseRow>
    </div>
  </div>
</template>
