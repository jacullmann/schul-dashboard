<template>
  <div class="card rlc">
    <h3>Cookie-Einstellungen</h3>
    <p>
      Aktueller Status:
      <span v-if="accepted" class="badge">Akzeptiert</span>
      <span v-else class="badge">Abgelehnt</span>
    </p>

    <label class="switch">
      <input type="checkbox" v-model="accepted" @change="toggleConsent" />
      <span class="slider"></span>
    </label>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const accepted = ref(false)

onMounted(() => {
  const consent = localStorage.getItem('cookie_consent')
  if (consent) {
    const parsed = JSON.parse(consent)
    const expires = new Date(parsed.expires)
    if (parsed.accepted && new Date() < expires) {
      accepted.value = true
    }
  }
})

function toggleConsent() {
  if (accepted.value) {
    const expires = new Date()
    expires.setDate(expires.getDate() + 28)
    localStorage.setItem('cookie_consent', JSON.stringify({
      accepted: true,
      expires
    }))
  } else {
    localStorage.removeItem('cookie_consent')
  }
}
</script>

<style scoped>
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: var(--sub);
  transition: .4s;
  border-radius: 26px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px; width: 20px;
  left: 3px; bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--primary);
}

input:checked + .slider:before {
  transform: translateX(24px);
}
</style>
