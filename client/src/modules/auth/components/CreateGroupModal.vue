<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Modal from '@/common/components/Modal.vue';
import LoadingSpinner from "@/common/components/LoadingSpinner.vue";
import { Eye, EyeOff } from 'lucide-vue-next';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useUserStore } from "@/stores/userStore";

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const router = useRouter();
const auth = useAppAuth();
const userStore = useUserStore();
const { activeGroupId } = useAppAuth();

const groupNameInputRef = ref<HTMLInputElement | null>(null);

const groupName = ref('');
const password = ref('');
const passwordConfirm = ref('');
const showPassword = ref(false);
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

      emit('close');
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
  <Modal @cancel="$emit('close')">
    <template #title>
      Gruppe erstellen
    </template>

    <template #content>
      <form id="create-group-form" @submit.prevent="submit" class="form-content" novalidate>
        <div class="form-group">
          <label for="group-name">Gruppenname</label>
          <div class="input-wrapper">
            <input
                id="group-name"
                ref="groupNameInputRef"
                class="input"
                v-model="groupName"
                placeholder="Name der Gruppe"
                type="text"
                autocomplete="off"
                @input="clearError"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="group-password">Passwort</label>
          <div class="input-wrapper">
            <input
                id="group-password"
                class="input"
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                placeholder="Passwort"
                autocomplete="new-password"
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

        <div class="form-group">
          <label for="group-confirm">Passwort bestätigen</label>
          <div class="input-wrapper">
            <input
                id="group-confirm"
                class="input"
                :type="showPassword ? 'text' : 'password'"
                v-model="passwordConfirm"
                placeholder="Passwort wiederholen"
                autocomplete="new-password"
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
      <button
          form="create-group-form"
          type="submit"
          class="btn action submit-btn"
          :disabled="submitting || !isValid"
      >
        <LoadingSpinner v-if="submitting" color="white" size="1.2em" />
        <span v-else>Erstellen</span>
      </button>
    </template>
  </Modal>
</template>

<style scoped>
:deep(.modal-card) {
  max-width: 420px;
}

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
  color: var(--sub);
  display: flex;
  align-items: center;
  transition: color 0.1s ease;
}

.password-toggle:hover {
  color: var(--text);
}

.message {
  color: var(--text);
  font-size: var(--font-size-sub);
  margin-bottom: 16px;
}

.message.error {
  color: var(--danger);
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

@media (max-width: 500px) {
  :deep(.modal-card) {
    max-width: 100%;
  }
}
</style>
