<script setup lang="ts">
import { ref, onMounted } from 'vue';
import InfoModal from '@/common/components/InfoModal.vue';
import hw from '@/api/hwApi';
import { useToast } from '@/common/composables/useToast';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';

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
});

const loading = ref(true);
const saving = ref(false);

async function fetchPermissions() {
  loading.value = true;
  try {
    const { data } = await hw.get('/api/group-admin/permissions');
    if (data.permissions) {
      permissions.value = {
        ...permissions.value,
        ...data.permissions,
      };
    }
  } catch (err) {
    toast.error('Fehler beim Laden der Berechtigungen');
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
    const { data } = await hw.patch('/api/group-admin/permissions', {
      permissions: permissions.value,
    });
    if (data.ok) {
      toast.success('Berechtigung erfolgreich aktualisiert');
      await checkAuthStatus();
    } else {
      throw new Error();
    }
  } catch (err) {
    permissions.value[key] = originalValue;
    toast.error('Fehler beim Speichern der Berechtigung');
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
      Berechtigungen

      <template #info>
        <InfoModal
          tooltip="Übersicht des Gruppenberechtigungsmenüs"
          title="Berechtigungen"
        >
          <h3>Verwalte die Berechtigungen der Gruppenmitglieder</h3>
        </InfoModal>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex flex-col justify-center items-center py-10">
      <BaseSpinner size="32px" />
      <span class="text-sm text-on-ghost-muted mt-2">Berechtigungen werden geladen...</span>
    </div>

    <div v-else class="flex flex-col gap-4 relative">
      <div
        v-if="saving"
        class="absolute inset-0 bg-canvas/30 rounded-xl flex items-center justify-center z-10"
      >
        <BaseSpinner size="24px" />
      </div>

      <div v-if="!isAdmin" class="text-xs text-warning bg-warning/10 border border-warning/20 p-3 rounded-lg mb-2">
        Nur Gruppen-Administratoren können Berechtigungen anpassen.
      </div>

      <h3>Gruppeneinstellungen</h3>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost">
          Gruppenbild und -name bearbeiten
        </div>

        <BaseSelect
          :form="false"
          :modelValue="permissions.edit_group_general"
          @update:modelValue="savePermission('edit_group_general', $event)"
          :disabled="!isAdmin || saving"
          :options="[
            { label: 'Alle', value: 'user' },
            { label: 'Moderatoren', value: 'moderator' },
            { label: 'Admins', value: 'admin' },
          ]"
          classes="w-38!"
        />
      </BaseRow>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost">Fächer/Kursliste bearbeiten</div>

        <BaseSelect
          :form="false"
          :modelValue="permissions.edit_subjects_courses"
          @update:modelValue="savePermission('edit_subjects_courses', $event)"
          :disabled="!isAdmin || saving"
          :options="[
            { label: 'Moderatoren', value: 'moderator' },
            { label: 'Admins', value: 'admin' },
          ]"
          classes="w-38!"
        />
      </BaseRow>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost">Stundenplan bearbeiten</div>

        <BaseSelect
          :form="false"
          :modelValue="permissions.edit_schedule"
          @update:modelValue="savePermission('edit_schedule', $event)"
          :disabled="!isAdmin || saving"
          :options="[
            { label: 'Moderatoren', value: 'moderator' },
            { label: 'Admins', value: 'admin' },
          ]"
          classes="w-38!"
        />
      </BaseRow>

      <h3>Aufgaben</h3>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost">Neue Einträge erstellen</div>

        <BaseSelect
          :form="false"
          :modelValue="permissions.create_items"
          @update:modelValue="savePermission('create_items', $event)"
          :disabled="!isAdmin || saving"
          :options="[
            { label: 'Alle', value: 'user' },
            { label: 'Moderatoren', value: 'moderator' },
            { label: 'Admins', value: 'admin' },
          ]"
          classes="w-38!"
        />
      </BaseRow>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost">Bilder hochladen</div>

        <BaseSelect
          :form="false"
          :modelValue="permissions.upload_images"
          @update:modelValue="savePermission('upload_images', $event)"
          :disabled="!isAdmin || saving"
          :options="[
            { label: 'Alle', value: 'user' },
            { label: 'Moderatoren', value: 'moderator' },
            { label: 'Admins', value: 'admin' },
          ]"
          classes="w-38!"
        />
      </BaseRow>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost">
          Anmerkungen hinzufügen, bearbeiten und löschen
        </div>

        <BaseSelect
          :form="false"
          :modelValue="permissions.manage_notes"
          @update:modelValue="savePermission('manage_notes', $event)"
          :disabled="!isAdmin || saving"
          :options="[
            { label: 'Alle', value: 'user' },
            { label: 'Moderatoren', value: 'moderator' },
            { label: 'Admins', value: 'admin' },
          ]"
          classes="w-38!"
        />
      </BaseRow>

      <h3>Chat</h3>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost">Nachrichten senden</div>

        <BaseSelect
          :form="false"
          :modelValue="permissions.send_messages"
          @update:modelValue="savePermission('send_messages', $event)"
          :disabled="!isAdmin || saving"
          :options="[
            { label: 'Alle', value: 'user' },
            { label: 'Moderatoren', value: 'moderator' },
            { label: 'Admins', value: 'admin' },
          ]"
          classes="w-38!"
        />
      </BaseRow>

      <h3>Informationen</h3>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost hyphens-auto">
          Stundenplanänderungen hinzufügen und löschen
        </div>

        <BaseSelect
          :form="false"
          :modelValue="permissions.manage_schedule_changes"
          @update:modelValue="savePermission('manage_schedule_changes', $event)"
          :disabled="!isAdmin || saving"
          :options="[
            { label: 'Alle', value: 'user' },
            { label: 'Moderatoren', value: 'moderator' },
            { label: 'Admins', value: 'admin' },
          ]"
          classes="w-38!"
        />
      </BaseRow>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost">
          Ankündigungen hinzufügen und löschen
        </div>

        <BaseSelect
          :form="false"
          :modelValue="permissions.manage_announcements"
          @update:modelValue="savePermission('manage_announcements', $event)"
          :disabled="!isAdmin || saving"
          :options="[
            { label: 'Moderatoren', value: 'moderator' },
            { label: 'Admins', value: 'admin' },
          ]"
          classes="w-38!"
        />
      </BaseRow>

      <h3>Moderation</h3>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost">
          Mitglieder entfernen und bannen bzw. entbannen
        </div>

        <BaseSelect
          :form="false"
          :modelValue="permissions.moderate_members"
          @update:modelValue="savePermission('moderate_members', $event)"
          :disabled="!isAdmin || saving"
          :options="[
            { label: 'Moderatoren', value: 'moderator' },
            { label: 'Admins', value: 'admin' },
          ]"
          classes="w-38!"
        />
      </BaseRow>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost">
          Einträge, Bilder und Nachrichten von Nutzern löschen
        </div>

        <BaseSelect
          :form="false"
          :modelValue="permissions.delete_other_content"
          @update:modelValue="savePermission('delete_other_content', $event)"
          :disabled="!isAdmin || saving"
          :options="[
            { label: 'Moderatoren', value: 'moderator' },
            { label: 'Admins', value: 'admin' },
          ]"
          classes="w-38!"
        />
      </BaseRow>
    </div>
  </div>
</template>
