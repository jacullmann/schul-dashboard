<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useUserStore } from "@/stores/userStore";

const emit = defineEmits<{
  (e: 'cancel'): void;
}>();

const router = useRouter();
const auth = useAppAuth();
const userStore = useUserStore();
const { activeGroupId } = useAppAuth();

const groupNameInputRef = ref<HTMLInputElement | null>(null);

const groupName = ref('');
const password = ref('');
const passwordConfirm = ref('');
const submitting = ref(false);
const errorMsg = ref('');

const isValid = computed(() => {
  return groupName.value.trim().length > 0 &&
      password.value.length > 0 &&
      password.value === passwordConfirm.value;
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
    const res = await auth.createGroup(groupName.value.trim(), password.value);

    if (res.ok) {
      // CSRF token rotation is handled internally by createGroup/checkAuthStatus.
      try {
        await userStore.fetchUser();
      } catch {}

      emit('cancel');
      await router.push(`/groups/${activeGroupId.value}/items/all`);
    } else {
      errorMsg.value = res.error || 'Erstellen der Gruppe fehlgeschlagen';
    }
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } };
    errorMsg.value = e.response?.data?.error || 'Unbekannter Fehler';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <BaseModal @cancel="$emit('cancel')">
    <template #title>
      Gruppe erstellen
    </template>

    <template #content>
      <form id="create-group-form" @submit.prevent="submit" class="form-content" novalidate>
        <div class="form-group">
          <BaseLabel for="group-name">Gruppenname</BaseLabel>
          <BaseInput
              id="group-name"
              ref="groupNameInputRef"
              v-model="groupName"
              placeholder="Name der Gruppe"
              type="text"
              autocomplete="off"
              @input="clearError"
          />
        </div>

        <div class="form-group">
          <BaseLabel for="group-password">Passwort</BaseLabel>
          <BaseInput
              id="group-password"
              type="password"
              v-model="password"
              placeholder="Passwort"
              autocomplete="new-password"
              @input="clearError"
          />
        </div>

        <div class="form-group">
          <BaseLabel for="group-confirm">Passwort bestätigen</BaseLabel>
          <BaseInput
              id="group-confirm"
              type="password"
              v-model="passwordConfirm"
              placeholder="Passwort wiederholen"
              autocomplete="new-password"
              @input="clearError"
          />
        </div>

        <div v-if="errorMsg" class="message error">
          {{ errorMsg }}
        </div>
      </form>
    </template>

    <template #actions>
      <BaseButton form="create-group-form" type="submit" class="submit-btn" :disabled="submitting || !isValid" variant="action" :loading="submitting">
        Erstellen
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.form-content {
  display: flex;
  flex-direction: column;
}

.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}

.message {
  color: var(--color-on-surface);
  font-size: var(--text-sub);
  margin-bottom: 16px;
}

.message.error {
  color: var(--color-danger);
}

.submit-btn {
  width: 100%;
  justify-content: center;
  font-weight: 600;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
