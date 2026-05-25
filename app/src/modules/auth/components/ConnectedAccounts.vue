<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useOAuth } from '@/modules/auth/composables/useOAuth';
import GoogleIcon from '@/modules/auth/components/GoogleIcon.vue';

const { fetchLinkedProviders, unlinkGoogleAccount, initiateGoogleLogin } =
  useOAuth();

interface Provider {
  provider: string;
  email: string;
}

const providers = ref<Provider[]>([]);
const loading = ref(true);
const actionLoading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

const googleLinked = () => providers.value.some((p) => p.provider === 'google');
const googleProvider = () =>
  providers.value.find((p) => p.provider === 'google');

onMounted(async () => {
  providers.value = await fetchLinkedProviders();
  loading.value = false;
});

async function handleUnlink() {
  errorMsg.value = '';
  successMsg.value = '';
  actionLoading.value = true;

  const result = await unlinkGoogleAccount();
  actionLoading.value = false;

  if (result.ok) {
    providers.value = providers.value.filter((p) => p.provider !== 'google');
    successMsg.value = 'Google-Konto getrennt.';
  } else {
    errorMsg.value = result.error;
  }
}

function handleLink() {
  initiateGoogleLogin();
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="loading" class="flex justify-center p-4">
      <BaseSpinner on="ghost" size="20" />
    </div>

    <template v-else>
      <div
        class="flex items-center justify-between gap-3 p-3 bg-surface border border-surface-border rounded-xl"
      >
        <div class="flex items-center gap-3">
          <div
            class="size-10 flex items-center justify-center flex-shrink-0"
            aria-hidden="true"
          >
            <GoogleIcon :size="24" />
          </div>
          <div class="flex flex-col gap-0.5">
            <span class="text-base font-semibold text-on-ghost">Google</span>
            <span class="text-sm text-on-ghost-muted">{{
              googleLinked() ? googleProvider()?.email : 'Nicht verknüpft'
            }}</span>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <span
            v-if="googleLinked()"
            class="text-[0.75rem] text-success bg-success-surface px-2 py-0.5 rounded-full font-medium"
            >Verknüpft</span
          >

          <BaseButton
            v-if="googleLinked()"
            variant="ghost"
            :loading="actionLoading"
            @click="handleUnlink"
          >
            Trennen
          </BaseButton>

          <BaseButton
            v-else
            variant="action"
            :loading="actionLoading"
            @click="handleLink"
          >
            Verknüpfen
          </BaseButton>
        </div>
      </div>

      <div
        v-if="errorMsg"
        class="text-sm p-2 px-3 rounded-lg text-danger bg-danger-hover"
      >
        {{ errorMsg }}
      </div>
      <div
        v-if="successMsg"
        class="text-sm p-2 px-3 rounded-lg text-success bg-success-hover"
      >
        {{ successMsg }}
      </div>
    </template>
  </div>
</template>
