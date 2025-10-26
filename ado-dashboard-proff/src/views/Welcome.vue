<template>
  <div class="container auth-wrapper">
    <div class="auth-card">
      <h2 class="auth-title">Authorisierung </h2>
      <p class="small auth-hint">Bitte gib deinen persönlichen Zugangscode ein.</p>

      <div class="input-group">
        <input
            v-model="code"
            placeholder="Zugangscode"
            class="auth-input"
            type="password"
        />
      </div>
      <label class="checkbox-label">
        <input class="checkbox" type="checkbox" v-model="accepted" />
        <span style="font-size: 0.75rem">Ich stimme den Nutzungsbedingungen zu.</span>
      </label>

      <div class="auth-actions">
        <button data-umami-event="Welcome Page anmelden Button" class="btn primary-btn-auth" @click="submit" :disabled="!accepted">
          Anmelden
        </button>
        <For />
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <hr class="divider" />

      <div class="small footer-text">
        Dies ist eine private Applikation. Bei Problemen kontaktiere den Administrator.
        Zutritt ausschließlich für autorisierte Benutzer. Unbefugtes Betreten ist verboten und wird straf- und zivilrechtlich verfolgt.
      </div>


    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import For from '../components/LegalF.vue'
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const auth = useAuth();
const code = ref('');
const error = ref<string | null>(null);
const accepted = ref(false)

async function submit() {
  error.value = null;
  const res =  await auth.loginWithCode(code.value.trim());
  if (res.ok) {
    auth.refreshExpiry();
    router.push('/items/HAUSAUFGABE');
    umami.track('Welcome Page Login erfolgreich');
  } else {
    error.value = res.error || 'Login fehlgeschlagen. Bitte Code prüfen.';
  }
}

function doLogout() {
  auth.logout();
  window.location.href ='https://schul-dashboards.onrender.com'
}
</script>

<style scoped>
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  font-size: 0.9rem;
  color: var(--text);
}

.checkbox-label .checkbox {
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid #999;
  border-radius: 4px;
  display: inline-block;
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.checkbox-label .checkbox:checked {
  background-color: #007aff;
  border-color: #007aff;
}

.checkbox-label .checkbox:checked::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) rotate(45deg);
  width: 6px;
  height: 12px;
  border: solid white;
  border-width: 0 2px 2px 0;
}

.checkbox-label .checkbox:focus {
  outline: none;
}


.auth-wrapper {
  max-width: 440px;
  margin: 60px auto 100px;
  padding: 16px;
}
.auth-card {
  background: var(--card);
  padding: 30px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 20px 20px 20px rgba(0, 0, 0, 0.6);
  transition: all 0.3s ease;
}
.auth-card:hover {
}


.auth-title {
  margin-top: 0;
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text);
}
.auth-hint {
  color: var(--muted);
  margin-bottom: 25px;
}


.input-group {
  margin: 15px 0 20px 0;
}
.auth-input {
  padding: 12px 14px;
  border-radius:8px;
  border: 2px solid transparent;
  background: var(--jj);
  color:var(--text);
  width:100%;
  font-size: 1rem;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}
.auth-input:focus {
  outline: none;
  border-color: #494749;
  background: #111;
}


.auth-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 20px;
}
.btn {
  padding: 10px 18px;
  border-radius:8px;
  cursor:pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}
.primary-btn-auth {
  flex-grow: 1;
  background: linear-gradient(65deg, #523de6, #8f0b9e);
  color: white;
  border: none;
  transition: 0.21s;
}
.primary-btn-auth:hover:not(:disabled) {

}
.primary-btn-auth:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: linear-gradient(65deg, #523de6, #8f0b9e);
}

.logout-btn {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--jj);
}
.logout-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
}


.error-message {
  color:var(--danger);
  margin-top:15px;
  padding: 10px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 6px;
  font-size: 0.9rem;
}
.divider {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  margin: 30px 0;
}
.footer-text {
  font-size:12px;
  color:var(--muted);
  text-align: center;
}

@media (max-width: 520px) {
  .auth-wrapper { margin: 30px auto 60px; }
  .auth-card { padding: 20px; }
  .auth-actions { flex-direction: column; gap: 8px; }
  .btn { width: 100%; }
}
</style>