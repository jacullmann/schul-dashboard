<template>
  <div class="card">
    <h2 style="margin-top:0;">Namenskürzel Finder</h2>
    <p class="small">Gib links ein Kürzel oder einen Namen ein. Rechts erscheint automatisch das Ergebnis.</p>

    <div class="row">
      <!-- Input -->
      <div class="col">
        <input
            v-model="inputValue"
            class="input"
            :placeholder="mode==='shortToName' ? 'z. B. mü, gl...' : 'z. B. Frau Glier, Herr Müller oder nur Nachname...'"
        />
        <div v-if="mode==='nameToShort' && suggestions.length > 0 && !outputValue" class="suggestion">
          Meintest du vielleicht
          <span
              v-for="(s, idx) in suggestions"
              :key="idx"
              @click="applySuggestion(s)"
              class="suggestion-link"
          >
            {{ s.title }} {{ s.name }}<span v-if="idx < suggestions.length-1">,</span>
          </span>
          ?
        </div>
      </div>

      <!-- Switch Button -->
      <div class="switch-col">
        <button
            class="switch-btn"
            :class="{ rotated: isRotated }"
            @click="toggleMode"
            title="Richtung wechseln"
            data-umami-event="Kürzel Richtung Switch "
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="switch-icon" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z" />
          </svg>
        </button>
        <div class="mode-label">
          {{ mode==='shortToName' ? 'Kürzel → Name' : 'Name → Kürzel' }}
        </div>
      </div>

      <!-- Output -->
      <div class="col">
        <input
            class="input"
            :value="outputValue"
            readonly
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const persons = [
  { name: 'Akdemir', title: 'Frau', short: 'Ak' },
  { name: 'Antany', title: 'Frau', short: 'An' },
  { name: 'Austerfield', title: 'Herr', short: 'Au' },
  { name: 'Beeskow', title: 'Frau', short: 'Bee' },
  { name: 'Benzin', title: 'Herr', short: 'Bz' },
  { name: 'Berg', title: 'Herr', short: 'Bg' },
  { name: 'Berndt', title: 'Herr', short: 'Be' },
  { name: 'Bies', title: 'Herr', short: 'Bs' },
  { name: 'Blanke', title: 'Frau', short: 'Ba' },
  { name: 'Borchers', title: 'Herr', short: 'Bo' },
  { name: 'Burkert', title: 'Frau', short: 'Bu' },
  { name: 'Burkhardt', title: 'Frau', short: 'Bt' },
  { name: 'Chahine', title: 'Herr', short: 'Cn' },
  { name: 'Damde', title: 'Frau', short: 'Dm' },
  { name: 'Delikaya', title: 'Herr', short: 'Dk' },
  { name: 'Dias', title: 'Frau', short: 'Da' },
  { name: 'Dreyer', title: 'Herr', short: 'Dy' },
  { name: 'Drumm', title: 'Frau', short: 'Dru' },
  { name: 'Eckelmann', title: 'Frau', short: 'Em' },
  { name: 'Eckers', title: 'Frau', short: 'Ecs' },
  { name: 'Eckert', title: 'Frau', short: 'Ec' },
  { name: 'Ellsiepen', title: 'Frau', short: 'El' },
  { name: 'Glier', title: 'Frau', short: 'Gl' },
  { name: 'Herrmann', title: 'Herr', short: 'Hr' },
  { name: 'Keller', title: 'Frau', short: 'Kel' },
  { name: 'Kießling', title: 'Frau', short: 'Ks' },
  { name: 'Klähn', title: 'Frau', short: 'Kae' },
  { name: 'Klein', title: 'Frau', short: 'Ke' },
  { name: 'Klose', title: 'Frau', short: 'Kl' },
  { name: 'Korte', title: 'Frau', short: 'Kor' },
  { name: 'Kröse', title: 'Herr', short: 'Kr' },
  { name: 'Lee', title: 'Frau', short: 'Le' },
  { name: 'Lillge', title: 'Frau', short: 'Lg' },
  { name: 'Lippke', title: 'Frau', short: 'Li' },
  { name: 'Look', title: 'Frau', short: 'Lo' },
  { name: 'Luxen', title: 'Herr', short: 'Lu' },
  { name: 'Magnus', title: 'Herr', short: 'Mg' },
  { name: 'Matzies', title: 'Frau', short: 'Mz' },
  { name: 'Meister', title: 'Herr', short: 'Mr' },
  { name: 'Moresmau', title: 'Herr', short: 'Mo' },
  { name: 'Müller', title: 'Frau', short: 'Mue' },
  { name: 'Müller', title: 'Herr', short: 'Me' },
  { name: 'Nagler', title: 'Frau', short: 'Ng' },
  { name: 'Naujoks', title: 'Herr', short: 'Na' },
  { name: 'Nehse', title: 'Frau', short: 'Nh' },
  { name: 'Nix', title: 'Frau', short: 'Nx' },
  { name: 'Paasch', title: 'Frau', short: 'Pa' },
  { name: 'Paulus', title: 'Frau', short: 'Ps' },
  { name: 'Peukert', title: 'Herr', short: 'Pt' },
  { name: 'Preuß', title: 'Herr', short: 'Pr' },
  { name: 'Prey', title: 'Frau', short: 'Py' },
  { name: 'Rehlinghaus', title: 'Frau', short: 'Rh' },
  { name: 'Röhnert', title: 'Frau', short: 'Rt' },
  { name: 'Schalge', title: 'Herr', short: 'Sg' },
  { name: 'Schenk', title: 'Frau', short: 'Sk' },
  { name: 'Schlüter', title: 'Herr', short: 'Sü' },
  { name: 'Schmelzer', title: 'Frau', short: 'Sz' },
  { name: 'Schmid', title: 'Frau', short: 'Sd' },
  { name: 'Schmitt', title: 'Frau', short: 'Sc' },
  { name: 'Schneider', title: 'Frau', short: 'Ser' },
  { name: 'Scholler', title: 'Frau', short: 'Sol' },
  { name: 'Sonnemann', title: 'Frau', short: 'So' },
  { name: 'Stilo', title: 'Frau', short: 'St' },
  { name: 'Stöhr', title: 'Herr', short: 'Sr' },
  { name: 'Thamm', title: 'Frau', short: 'Tm' },
  { name: 'Türhan', title: 'Frau', short: 'Tn' },
  { name: 'Ucaroglu', title: 'Frau', short: 'Uc' },
  { name: 'von Wangenheim', title: 'Frau', short: 'Wh' },
  { name: 'Waked', title: 'Frau', short: 'Wd' },
  { name: 'Weber', title: 'Herr', short: 'We' },
  { name: 'Yatkin', title: 'Frau', short: 'Ya' },
  { name: 'Zimmermann', title: 'Herr', short: 'Zm' },
  { name: 'Kanye', title: '', short: 'GOAT' },
  { name: 'I miss the old Kanye', title: '', short: 'Ye' },
  { name: 'Haupt', title: 'Frau', short: 'Ha' }

]

const mode = ref<'shortToName' | 'nameToShort'>('shortToName')
const inputValue = ref('')
const suggestions = ref<any[]>([])
const isRotated = ref(false)

function normalize(str: string) {
  return str
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
}

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

function similarity(a: string, b: string) {
  const longer = a.length > b.length ? a : b
  const shorter = a.length > b.length ? b : a
  const longerLength = longer.length
  if (longerLength === 0) return 1.0
  return (longerLength - editDistance(longer, shorter)) / longerLength
}

const outputValue = computed(() => {
  const q = normalize(inputValue.value)
  suggestions.value = []

  if (!q) return ''

  if (mode.value === 'shortToName') {
    const match = persons.find(p => normalize(p.short) === q)
    return match ? `${match.title} ${match.name}` : ''
  } else {
    // exakter Treffer mit Anrede
    const match = persons.find(p => normalize(p.title + p.name) === q)
    if (match) return match.short

    // exakter Treffer nur Nachname
    const matchesByName = persons.filter(p => normalize(p.name) === q)
    if (matchesByName.length === 1) {
      return matchesByName[0].short
    }
    if (matchesByName.length > 1) {
      suggestions.value = matchesByName
      return ''
    }

    // unscharfe Suche
    let bestScore = 0
    persons.forEach(p => {
      const score = similarity(q, normalize(p.name))
      if (score > 0.6) {
        suggestions.value.push(p)
        if (score > bestScore) bestScore = score
      }
    })
    return ''
  }
})

function applySuggestion(person: any) {
  if (person) {
    inputValue.value = `${person.title} ${person.name}`
    suggestions.value = []
  }
}

function toggleMode() {
  isRotated.value = !isRotated.value
  mode.value = mode.value === 'shortToName' ? 'nameToShort' : 'shortToName'
  inputValue.value = ''
  suggestions.value = []
}
</script>

<style scoped>
.row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
}
.col {
  flex: 1;
  min-width: 280px;
}
.switch-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.switch-btn {
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.3s;
}
.switch-btn:hover {
  background: #33609e;
}
.switch-icon {
  width: 22px;
  height: 22px;
  transition: transform 0.3s ease-in-out;
}
.switch-btn.rotated .switch-icon {
  transform: rotate(180deg);
}
.mode-label {
  margin-top: 6px;
  font-size: 12px;
  color: #aaa;
  text-align: center;
}
.input {
  width: 100%;
  padding: 10px;
  border-radius: 6px;
  background: #2a2a2a;
  color: #fff;
}
.suggestion {
  margin-top: 8px;
  color: var(--danger);
  font-style: italic;
}
.suggestion-link {
  cursor: pointer;
  color: var(--primary);
  font-weight: bold;
  margin-left: 4px;
}
</style>





