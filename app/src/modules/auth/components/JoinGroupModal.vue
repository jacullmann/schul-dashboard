<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useUserStore } from '@/stores/userStore';
import { useModalStore } from '@/stores/modalStore';

const emit = defineEmits<{
  (e: 'cancel'): void;
}>();

const router = useRouter();
const auth = useAppAuth();
const userStore = useUserStore();
const modalStore = useModalStore();
const { activeGroupId } = useAppAuth();

const groupNameInputRef = ref<HTMLInputElement | null>(null);

const groupName = ref('');
const password = ref('');
const submitting = ref(false);
const errorMsg = ref('');

const isValid = computed(() => {
  return groupName.value.trim().length > 0 && password.value.length > 0;
});

function clearError() {
  errorMsg.value = '';
}

onMounted(() => {
  setTimeout(() => {
    groupNameInputRef.value?.focus();
  }, 100);
});

async function submit() {
  if (!isValid.value || submitting.value) return;

  submitting.value = true;
  errorMsg.value = '';

  try {
    const res = await auth.joinGroup(groupName.value.trim(), password.value);

    if (res.ok) {
      // CSRF token rotation is handled internally by joinGroup/checkAuthStatus.
      try {
        await userStore.fetchUser();
      } catch {}

      emit('cancel');
      await router.push(`/groups/${activeGroupId.value}/items/all`);
      modalStore.showSetup = true;
    } else {
      errorMsg.value = res.error || 'Zugriff verweigert. Code prüfen.';
    }
  } catch (err: unknown) {
    const e = err as { message?: string };
    errorMsg.value = e.message || 'Verbindungsfehler';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <BaseModal
    @cancel="$emit('cancel')"
    :submit="submit"
    :loading="submitting"
    :error="errorMsg"
    :cancel="undefined"
  >
    <template #title> Gruppe beitreten </template>

    <template #content>
      <BaseFormGroup id="join-group-name">
        <BaseLabel for="join-group-name">Gruppenname</BaseLabel>
        <BaseInput
          id="join-group-name"
          ref="groupNameInputRef"
          v-model="groupName"
          placeholder="Name der Gruppe"
          type="text"
          autocomplete="off"
          @input="clearError"
        />
      </BaseFormGroup>

      <BaseFormGroup id="join-group-password">
        <BaseLabel for="join-group-password">Zugangscode</BaseLabel>
        <BaseInput
          id="join-group-password"
          type="password"
          v-model="password"
          placeholder="Zugangscode"
          autocomplete="current-password"
          @input="clearError"
        />
      </BaseFormGroup>
    </template>

    <template #action-text> Beitreten </template>
  </BaseModal>
</template>
