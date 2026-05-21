<script setup lang="ts">
import InfoModal from '@/common/components/InfoModal.vue';
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

    <div class="flex flex-col gap-4">
      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost hyphens-auto">
          Stundenplanänderungen hinzufügen und löschen
        </div>

        <BaseSelect
          :form="false"
          modelValue="moderator"
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
          Mitglieder entfernen und bannen bzw. entbannen
        </div>

        <BaseSelect
          :form="false"
          modelValue="moderator"
          :options="[
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
          modelValue="admin"
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
          modelValue="admin"
          :options="[
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
          modelValue="moderator"
          :options="[
            { label: 'Moderatoren', value: 'moderator' },
            { label: 'Admins', value: 'admin' },
          ]"
          classes="w-38!"
        />
      </BaseRow>

      <BaseRow justify="between" class="flex-nowrap!">
        <div class="text-base text-on-ghost">
          Gruppenbild und -name bearbeiten
        </div>

        <BaseSelect
          :form="false"
          modelValue="moderator"
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
          Neue Einträge erstellen und Bilder hinzufügen
        </div>

        <BaseSelect
          :form="false"
          modelValue="user"
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
          Anmerkungen an Einträge anhängen
        </div>

        <BaseSelect
          :form="false"
          modelValue="moderator"
          :options="[
            { label: 'Alle', value: 'user' },
            { label: 'Moderatoren', value: 'moderator' },
            { label: 'Admins', value: 'admin' },
          ]"
          classes="w-38!"
        />
      </BaseRow>
    </div>
  </div>
</template>
