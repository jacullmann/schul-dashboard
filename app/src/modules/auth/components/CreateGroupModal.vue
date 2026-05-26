<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useUserStore } from '@/stores/userStore';

const { t } = useI18n();

defineProps<{
  open: boolean;
}>();

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
  return (
    groupName.value.trim().length > 0 &&
    password.value.length > 0 &&
    password.value === passwordConfirm.value
  );
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
      try {
        await userStore.fetchUser();
      } catch {}

      emit('cancel');
      await router.push(`/groups/${activeGroupId.value}/items/all`);
    } else {
      errorMsg.value = res.error || t('auth.groups.errors.create_failed');
    }
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } };
    errorMsg.value = e.response?.data?.error || t('common.errors.unknown');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    @cancel="$emit('cancel')"
    :submit="submit"
    :loading="submitting"
    :error="errorMsg"
    :cancel="undefined"
  >
    <template #title>{{ t('common.groups.create_group') }}</template>

    <template #content>
      <BaseFormGroup id="group-name">
        <BaseLabel for="group-name">Gruppenname</BaseLabel>
        <BaseInput
          id="group-name"
          ref="groupNameInputRef"
          v-model="groupName"
          :placeholder="t('admin.general.appearance.name_placeholder')"
          type="text"
          autocomplete="off"
          @input="clearError"
        />
      </BaseFormGroup>

      <BaseFormGroup id="group-password">
        <BaseLabel for="group-password">{{ t('auth.login.password') }}</BaseLabel>
        <BaseInput
          id="group-password"
          type="password"
          v-model="password"
          :placeholder="t('auth.login.password')"
          autocomplete="new-password"
          @input="clearError"
        />
      </BaseFormGroup>

      <BaseFormGroup id="group-confirm">
        <BaseLabel for="group-confirm">{{ t('auth.login.confirm_password') }}</BaseLabel>
        <BaseInput
          id="group-confirm"
          type="password"
          v-model="passwordConfirm"
          :placeholder="t('auth.login.confirm_placeholder')"
          autocomplete="new-password"
          @input="clearError"
        />
      </BaseFormGroup>
    </template>

    <template #action-text> {{ t('common.buttons.create') }} </template>
  </BaseModal>
</template>
