<template>
  <div class="container auth-wrapper">
    <div class="auth-card">
      <h2 class="auth-title">Zugang erforderlich</h2>
      <p class="small auth-hint">Bitte gib deinen persönlichen Zugangscode ein.</p>

      <div class="input-group">
        <input
            v-model="code"
            placeholder="Zugangscode"
            class="auth-input"
            @keyup.enter="submit"
            type="password"
        />
      </div>

      <div class="auth-actions">
        <button class="btn primary-btn-auth" @click="submit" :disabled="!code.trim()">
          Anmelden
        </button>
        <button v-if="auth.isAuthenticated" class="btn logout-btn" @click="doLogout">
          Abmelden
        </button>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <hr class="divider" />

      <div class="small footer-text">
        Dies ist eine private Applikation. Bei Problemen kontaktiere den Administrator.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
// Annahme: Die useRouter und useAuth Imports sind korrekt
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const auth = useAuth();
const code = ref('');
const error = ref<string | null>(null);

function submit() {
  error.value = null;
  const res = auth.loginWithCode(code.value.trim());
  if (res.ok) {
    // Weiterleitung zur Startseite nach erfolgreichem Login
    auth.refreshExpiry();
    router.push('/items/HAUSAUFGABE');
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
/* Container und Card */
.auth-wrapper {
  max-width: 440px;
  margin: 60px auto 100px; /* Mehr Platz am unteren Rand */
  padding: 16px;
}
.auth-card {
  background: var(--card);
  padding: 30px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
  transition: all 0.3s ease;
}
.auth-card:hover {
  box-shadow: 0 15px 50px rgba(58, 12, 163, 0.3);
}

/* Typografie */
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

/* Eingabefeld */
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
  border-color: #3A0CA3;
  box-shadow: 0 0 0 3px rgba(58, 12, 163, 0.5);
  background: #111;
}

/* Aktionen (Buttons) */
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
  background: linear-gradient(90deg, var(--primary), #a020f0);
  color: white;
  border: none;
  box-shadow: 0 4px 15px rgba(58, 12, 163, 0.2);
}
.primary-btn-auth:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(58, 12, 163, 0.4);
}
.primary-btn-auth:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

/* Sonstiges */
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
