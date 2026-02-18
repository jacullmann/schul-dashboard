<template>
    <!-- Admin Controls -->
    <div v-if="user?.isAdmin" class="card rlc">
      <h3>Adminbereich</h3>
      <div class="row">
        <div class="col">
          <input
              v-model="newCountdown.name"
              class="input"
              placeholder="Countdown Name"
              maxlength="100"
          >
        </div>
        <div class="col">
          <input
              v-model="newCountdown.description"
              class="input"
              placeholder="Beschreibung"
              maxlength="200"
          >
        </div>
        <div class="col">
          <input
              type="datetime-local"
              v-model="newCountdown.target_date"
              class="input"
          >
        </div>
      </div>
      <div class="row" style="margin-top: 12px;">
        <button
            class="btn"
            @click="createCountdown"
            :disabled="!canCreateCountdown"
            data-umami-event="Countdown erstellen"
        >
          {{ editingCountdown ? 'Countdown aktualisieren' : 'Countdown erstellen' }}
        </button>
        <button
            v-if="editingCountdown"
            class="btn ghost"
            @click="cancelEdit"
        >
          Bearbeiten abbrechen
        </button>
      </div>
    </div>

    <!-- Countdown List -->
    <div class="card rlc" v-for="countdown in countdowns" :key="countdown.id">
      <div class="row">
        <div class="col">
          <h3>{{ countdown.name }}</h3>
          <p class="small">{{ countdown.description }}</p>
          <p class="small" style="color: var(--sub); margin-top: 4px;">
            {{ new Date(countdown.target_date).toLocaleString('de-DE') }}
          </p>
        </div>
        <div class="col">
          <select
              v-model="countdownUnits[countdown.id]"
              class="input"
              @change="saveUnitPreference(countdown.id, countdownUnits[countdown.id])"
          >
            <option value="milliseconds">Millisekunden</option>
            <option value="seconds">Sekunden</option>
            <option value="minutes">Minuten</option>
            <option value="hours">Stunden</option>
            <option value="days">Tage</option>
            <option value="weeks">Wochen</option>
            <option value="months">Monate</option>
            <option value="years">Jahre</option>
          </select>
        </div>

        <!-- Admin Actions -->
        <div v-if="user?.isAdmin" class="col" style="min-width: auto;">
          <div class="row" style="gap: 8px; flex-wrap: nowrap;">
            <button
                class="btn ghost small"
                @click="editCountdown(countdown)"
                title="Bearbeiten"
                data-umami-event="Countdown bearbeiten"
            >
              <Pencil />

            </button>
            <button
                class="btn danger small"
                @click="deleteCountdown(countdown.id)"
                title="Löschen"
                data-umami-event="Countdown löschen"
            >
              <Trash2 />

            </button>
          </div>
        </div>
      </div>

      <hr />

      <div class="countdown-display">
        <h1 style="font-size: 2.5rem; margin: 0; text-align: center;">
          {{ formatCountdown(countdown) }}
        </h1>
        <p class="small" style="text-align: center; margin-top: 8px;">
          {{ new Date(countdown.target_date).toLocaleDateString('de-DE') }}
        </p>
      </div>
    </div>

    <div v-if="loading" class="card rlc">
      <div class="loader">
        <LoadingSpinner color="#fff" size="1.2em" />
        <div style="color: #aaaaaa">Lade Countdowns...</div>
      </div>
    </div>

    <div v-if="error" class="card rlc">
      <p style="color: var(--danger); text-align: center;">{{ error }}</p>
    </div>

    <div v-if="countdowns.length === 0 && !loading" class="card rlc">
      <p style="text-align: center; color: var(--sub);">
        Noch keine Countdowns vorhanden.
        <span v-if="user?.isAdmin">Erstelle einen Countdown! Für Dorisx!</span>
      </p>
    </div>

    <div v-if="successMessage" class="card rlc" style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3);">
      <p style="color: #22c55e; text-align: center; margin: 0;">{{ successMessage }}</p>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { supabase } from '@/composables/Datatable.ts'
import hw from '@/hwApi.ts'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { Pencil, Trash2 } from 'lucide-vue-next'

interface Countdown {
  id: string
  name: string
  description: string
  target_date: string
  created_at?: string
}

const countdowns = ref<Countdown[]>([])
const countdownUnits = ref<Record<string, string>>({})
const loading = ref(true)
const error = ref('')
const successMessage = ref('')
const editingCountdown = ref<Countdown | null>(null)
const user = ref<any>(null)
let animationFrame: number

// Neue Countdown-Daten
const newCountdown = ref({
  name: '',
  description: '',
  target_date: ''
})

// Countdown-Einheiten definieren
const timeUnits = {
  milliseconds: 1,
  seconds: 1000,
  minutes: 1000 * 60,
  hours: 1000 * 60 * 60,
  days: 1000 * 60 * 60 * 24,
  weeks: 1000 * 60 * 60 * 24 * 7,
  months: 1000 * 60 * 60 * 24 * 30.436875,
  years: 1000 * 60 * 60 * 24 * 365.2425
}

// Validierung für neue Countdowns
const canCreateCountdown = computed(() => {
  return newCountdown.value.name.trim().length > 0 &&
      newCountdown.value.target_date &&
      new Date(newCountdown.value.target_date) > new Date()
})

// User-Daten laden
const loadUser = async () => {
  try {
    const { data } = await hw.get('/api/auth/me')
    user.value = data
  } catch (err) {
    user.value = null
  }
}

// Countdowns aus Supabase laden
const loadCountdowns = async () => {
  try {
    loading.value = true
    const { data, error: supabaseError } = await supabase
        .from('countdowns')
        .select('*')
        .order('target_date', { ascending: true })

    if (supabaseError) throw supabaseError

    countdowns.value = data || []

    // Standard-Einheiten für jeden Countdown setzen
    countdowns.value.forEach(countdown => {
      if (!countdownUnits.value[countdown.id]) {
        countdownUnits.value[countdown.id] = 'days'
      }
    })

    // Geladene Präferenzen aus localStorage anwenden
    loadUnitPreferences()

  } catch (err) {
    error.value = 'Fehler beim Laden der Countdowns: ' + (err as Error).message
    setTimeout(() => error.value = '', 5000)
  } finally {
    loading.value = false
  }
}

// Einheiten-Präferenzen aus localStorage laden
const loadUnitPreferences = () => {
  countdowns.value.forEach(countdown => {
    const savedUnit = localStorage.getItem(`countdown_unit_${countdown.id}`)
    if (savedUnit) {
      countdownUnits.value[countdown.id] = savedUnit
    }
  })
}

// Einheiten-Präferenz speichern
const saveUnitPreference = (countdownId: string, unit: string) => {
  localStorage.setItem(`countdown_unit_${countdownId}`, unit)
}

// Countdown erstellen oder aktualisieren
const createCountdown = async () => {
  if (!canCreateCountdown.value) return

  try {
    const countdownData = {
      name: newCountdown.value.name.trim(),
      description: newCountdown.value.description.trim(),
      target_date: newCountdown.value.target_date
    }

    if (editingCountdown.value) {
      // Countdown über API aktualisieren
      await hw.put(`/api/admin/countdowns/${editingCountdown.value.id}`, countdownData)
      handleSuccess('Countdown erfolgreich aktualisiert')
      editingCountdown.value = null
    } else {
      // Neuen Countdown über API erstellen
      await hw.post('/api/admin/countdowns', countdownData)
      handleSuccess('Countdown erfolgreich erstellt')
    }

    // Formular zurücksetzen
    newCountdown.value = { name: '', description: '', target_date: '' }

    // Countdowns neu laden
    await loadCountdowns()

  } catch (err: any) {
    const errMsg = err.response?.data?.error || 'Unbekannter Fehler'
    error.value = 'Fehler: ' + errMsg
    setTimeout(() => error.value = '', 5000)
  }
}

// Countdown bearbeiten
const editCountdown = (countdown: Countdown) => {
  editingCountdown.value = countdown
  newCountdown.value = {
    name: countdown.name,
    description: countdown.description,
    target_date: countdown.target_date.slice(0, 16) // Für datetime-local Format
  }
}

// Bearbeitung abbrechen
const cancelEdit = () => {
  editingCountdown.value = null
  newCountdown.value = { name: '', description: '', target_date: '' }
}

// Countdown löschen
const deleteCountdown = async (id: string) => {
  if (!confirm('Möchtest du diesen Countdown wirklich löschen?')) {
    return
  }

  try {
    await hw.delete(`/api/admin/countdowns/${id}`)
    handleSuccess('Countdown erfolgreich gelöscht')
    await loadCountdowns()

  } catch (err: any) {
    const errMsg = err.response?.data?.error || 'Unbekannter Fehler'
    error.value = 'Fehler beim Löschen: ' + errMsg
    setTimeout(() => error.value = '', 5000)
  }
}

// Erfolgsmeldung anzeigen
const handleSuccess = (message: string) => {
  successMessage.value = message
  setTimeout(() => {
    successMessage.value = ''
  }, 5000)
}

// Countdown formatieren
const formatCountdown = (countdown: Countdown) => {
  const targetDate = new Date(countdown.target_date).getTime()
  const now = Date.now()
  const difference = targetDate - now

  if (difference <= 0) {
    return 'Abgelaufen'
  }

  const unit = countdownUnits.value[countdown.id] || 'days'
  const unitValue = timeUnits[unit as keyof typeof timeUnits]
  const value = difference / unitValue

  // Maximale Genauigkeit basierend auf der Einheit
  let decimals = 0
  if (unit === 'milliseconds') decimals = 0
  else if (unit === 'seconds') decimals = 3
  else if (unit === 'minutes') decimals = 6
  else if (unit === 'hours') decimals = 9
  else if (unit === 'days') decimals = 12
  else if (unit === 'weeks') decimals = 12
  else if (unit === 'months') decimals = 12
  else if (unit === 'years') decimals = 12

  return `${value.toFixed(decimals)} ${getUnitDisplayName(unit)}`
}

// Anzeigename für Einheiten
const getUnitDisplayName = (unit: string) => {
  const names: Record<string, string> = {
    milliseconds: 'ms',
    seconds: 'Sekunden',
    minutes: 'Minuten',
    hours: 'Stunden',
    days: 'Tage',
    weeks: 'Wochen',
    months: 'Monate',
    years: 'Jahre'
  }
  return names[unit] || unit
}

// Animation für live Updates
const updateCounts = () => {
  countdowns.value = [...countdowns.value]
  animationFrame = requestAnimationFrame(updateCounts)
}

onMounted(async () => {
  await loadUser()
  await loadCountdowns()
  animationFrame = requestAnimationFrame(updateCounts)
})

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
})
</script>

<style scoped>
.countdown-display {
  padding: 20px 0;
}

select.input {
  cursor: pointer;
}
.card {
  margin-bottom: 15px;
}

.btn.small {
  padding: 6px 8px;
  font-size: 12px;
  min-width: auto;
}

input[type="datetime-local"] {
  font-family: 'Roboto Slab', serif;
}

.loader {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  color: var(--sub);
}

/* Responsive Anpassungen */
@media (max-width: 768px) {
  .row {
    flex-direction: column;
  }

  .col {
    min-width: 100%;
  }

  .countdown-display h1 {
    font-size: 2rem !important;
  }
}
</style>