<template>
  <div class="card" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:100;">
    <div class="card styl" style="width:100%; max-width:420px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">{{ mode==='login' ? 'Anmelden' : 'Registrieren' }}</h3>
        <button class="btn ghost" @click="$emit('close')">Schließen</button>
      </div>

      <div class="row" style="margin-top:12px;">
        <button class="btn" :class="{ ghost: mode!=='login' }" @click="mode='login'">Login</button>
        <button class="btn" :class="{ ghost: mode!=='register' }" @click="mode='register'">Registrieren</button>
      </div>

      <div style="margin-top:12px;">
        <input class="input" v-model="email" placeholder="E-Mail" />
      </div>
      <div style="margin-top:8px;">
        <input class="input" type="password" v-model="password" placeholder="Passwort (min. 8 Zeichen)" />
      </div>

      <div class="row" style="margin-top:12px; align-items:center;">
        <button class="btn" @click="submit" :disabled="submitting">
          <svg v-if="submitting" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ mode==='login' ? 'Anmelden' : 'Registrieren' }}
        </button>
        <div v-if="message" class="small" :style="{ color: isError ? 'var(--danger)': 'var(--primary)' }">{{ message }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import hw, { setHwToken } from '../../hwApi';

const emit = defineEmits<{ (e: 'close'): void; (e: 'logged-in', token: string): void }>();

const mode = ref<'login' | 'register'>('login');
const email = ref('');
const password = ref('');
const submitting = ref(false);
const message = ref('');
const isError = ref(false);

async function submit() {
  submitting.value = true;
  message.value = '';
  isError.value = false;
  try {
    if (mode.value === 'register') {
      await hw.post('/api/auth/register', { email: email.value, password: password.value });
      message.value = 'Registriert. Bitte E-Mail prüfen und Link anklicken.';
      isError.value = false;
    } else {
      const { data } = await hw.post('/api/auth/login', { email: email.value, password: password.value });
      emit('logged-in', data.token);
    }
  } catch (e: any) {
    message.value = e.response?.data?.error || 'Unbekannter Fehler';
    isError.value = true;
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.styl {
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px) saturate(105%) brightness(105%);
  -webkit-backdrop-filter: blur(20px) saturate(105%) brightness(105%);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
}




</style>
