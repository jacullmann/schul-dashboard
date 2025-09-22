<template>
  <div class="card">
    <h2 style="margin-top:0;">Namenskürzel Finder</h2>
    <p class="small">
      Suche entweder nach Kürzel oder nach Namen. Die Eingabe ist fehlertolerant und sortiert nach Wahrscheinlichkeit.
    </p>

    <div class="row">
      <!-- Kürzel-Eingabe -->
      <div class="col">
        <h3>Kürzel → Name</h3>
        <input v-model="shortQuery" class="input" placeholder="z. B. mü, dmü, gl..." />
        <transition-group name="fade-slide" tag="div">
          <div
              v-for="(res, idx) in shortResults"
              :key="'short-' + res.person.name + idx"
              class="result-card"
          >
            <div class="title-line">
              <span class="pill">{{ res.person.title }}</span>
              <h3 class="name">{{ res.person.name }}</h3>
            </div>
            <p><strong>Kürzel:</strong> <span class="highlight">{{ res.person.short }}</span></p>
            <p v-if="res.person.info"><em>{{ res.person.info }}</em></p>
          </div>
        </transition-group>
        <div v-if="shortResults.length === 0 && shortQuery" class="no-result">
          Keine passenden Personen gefunden.
        </div>
      </div>

      <!-- Name-Eingabe -->
      <div class="col">
        <h3>Name → Kürzel</h3>
        <input v-model="nameQuery" class="input" placeholder="z. B. Müller, Herr Müller..." />
        <transition-group name="fade-slide" tag="div">
          <div
              v-for="(res, idx) in nameResults"
              :key="'name-' + res.person.name + idx"
              class="result-card"
          >
            <div class="title-line">
              <span class="pill">{{ res.person.title }}</span>
              <h3 class="name">{{ res.person.name }}</h3>
            </div>
            <p><strong>Kürzel:</strong> <span class="highlight">{{ res.person.short }}</span></p>
            <p v-if="res.person.info"><em>{{ res.person.info }}</em></p>
          </div>
        </transition-group>
        <div v-if="nameResults.length === 0 && nameQuery" class="no-result">
          Keine passenden Personen gefunden.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// Beispiel-Daten
const persons = [
  { name: 'Müller', title: 'Herr', short: 'MÜ', },
  { name: 'Meister', title: 'Herr', short: 'ME', },
  { name: 'Schmidt', title: 'Frau', short: 'SCH'},
  { name: 'Blanke', title: 'Frau', short: 'BA' },
  { name: 'Schlüter', title: 'Herr', short: 'SÜ' },
  { name: 'Glier', title: 'Frau', short: 'GL', },
]

// Eingaben
const shortQuery = ref('')
const nameQuery = ref('')

// Normalisierung
function normalize(str: string) {
  return str
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
}

// Levenshtein-Distanz
function editDistance(a: string, b: string) {
  const matrix: number[][] = []
  let i, j
  for (i = 0; i <= b.length; i++) matrix[i] = [i]
  for (j = 0; j <= a.length; j++) matrix[0][j] = j
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

// Ähnlichkeit 0–1
function similarity(a: string, b: string) {
  const longer = a.length > b.length ? a : b
  const shorter = a.length > b.length ? b : a
  const longerLength = longer.length
  if (longerLength === 0) return 1.0
  return (longerLength - editDistance(longer, shorter)) / longerLength
}

// Ergebnisse für Kürzel-Suche
const shortResults = computed(() => {
  const q = normalize(shortQuery.value)
  if (!q) return []
  const res = persons.map(p => {
    const score = similarity(q, normalize(p.short))
    return { person: p, score }
  }).filter(r => r.score > 0.3)
      .sort((a, b) => b.score - a.score)
  // Wenn ein Treffer sehr sicher ist (>0.85), nur diesen zeigen
  if (res.length && res[0].score > 0.85) return [res[0]]
  return res
})

// Ergebnisse für Namens-Suche
const nameResults = computed(() => {
  const q = normalize(nameQuery.value)
  if (!q) return []
  const res = persons.map(p => {
    const combined = normalize(p.title + p.name)
    const score = similarity(q, combined)
    return { person: p, score }
  }).filter(r => r.score > 0.3)
      .sort((a, b) => b.score - a.score)
  if (res.length && res[0].score > 0.85) return [res[0]]
  return res
})
</script>

<style scoped>
.row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.col {
  flex: 1;
  min-width: 280px;
}

.result-card {
  background: #1f1f1f;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  margin-top: 12px;
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.result-card:hover {
  transform: translateY(-3px);
  border-color: var(--primary);
}

.title-line {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pill {
  background: var(--primary);
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}
.name {
  margin: 0;
}
.highlight {
  color: var(--primary);
  font-weight: bold;
}
.no-result {
  margin-top: 12px;
  color: var(--danger);
  font-style: italic;
}

/* Transition Animation */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
