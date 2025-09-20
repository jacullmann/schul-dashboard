<template>
  <div class="card" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center;">
    <div class="card" style="width:100%; max-width:420px;">
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
        <button class="btn" @click="submit" :disabled="submitting">{{ mode==='login' ? 'Anmelden' : 'Registrieren' }}</button>
        <div v-if="message" class="small" :style="{ color: isError ? 'var(--danger)': 'var(--primary)' }">{{ message }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import hw from '../../hwApi';

const emit = defineEmits<{ (e:'close'): void; (e:'logged-in', token:string): void }>();

const mode = ref<'login'|'register'>('login');
const email = ref('');
const password = ref('');
const submitting = ref(false);
const message = ref('');
const isError = ref(false);

async function submit() {
  submitting.value = true;
  message.value = '';
  try {
    if (mode.value === 'register') {
      await hw.post('/api/auth/register', { email: email.value, password: password.value });
      message.value = 'Registriert. Bitte E-Mail prüfen und Link anklicken.';
      isError.value = false;
    } else {
      const { data } = await hw.post('/api/auth/login', { email: email.value, password: password.value });
      emit('logged-in', data.token);
    }
  } catch (e:any) {
    message.value = e?.response?.data?.error || 'Fehler';
    isError.value = true;
  } finally {
    submitting.value = false;
  }
}
</script>
