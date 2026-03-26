<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Eye, EyeOff } from '@lucide/vue';
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
const showPassword = ref(false);
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
  <BaseModal @cancel="$emit('cancel')">
    <template #title>
      Gruppe beitreten
    </template>

    <template #content>
      <form id="join-group-form" @submit.prevent="submit" class="form-content" novalidate>
        <div class="form-group">
          <label for="join-group-name">Gruppenname</label>
          <div class="input-wrapper">
            <BaseInput
                id="join-group-name"
                ref="groupNameInputRef"
                v-model="groupName"
                placeholder="Name der Gruppe"
                type="text"
                autocomplete="off"
                @input="clearError"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="join-group-password">Zugangscode</label>
          <div class="input-wrapper">
            <BaseInput
                id="join-group-password"
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                placeholder="Zugangscode"
                autocomplete="current-password"
                @input="clearError"
            />
            <button
                type="button"
                @click="showPassword = !showPassword"
                class="password-toggle"
                aria-label="Passwort anzeigen/verbergen"
            >
              <component :is="showPassword ? EyeOff : Eye" :size="20" />
            </button>
          </div>
        </div>

        <div v-if="errorMsg" class="message error">
          {{ errorMsg }}
        </div>
      </form>
    </template>

    <template #actions>
      <BaseButton form="join-group-form" type="submit" class="submit-btn" :disabled="submitting || !isValid" variant="action" :loading="submitting">
        Beitreten
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

.input-wrapper {
  display: flex;
  flex-direction: row;
  position: relative;
  align-items: center;
}

.password-toggle {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: var(--color-on-surface-muted);
  display: flex;
  align-items: center;
  transition: color 0.1s ease;
}

.password-toggle:hover {
  color: var(--color-on-surface);
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
