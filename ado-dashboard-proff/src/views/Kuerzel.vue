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
            :placeholder="mode==='shortToName' ? 'z. B. mü, gl...' : 'z. B. Frau Glier, Herr Müller...'"
        />
        <div v-if="mode==='nameToShort' && suggestion && !outputValue" class="suggestion">
          Meintest du vielleicht <span @click="applySuggestion" class="suggestion-link">{{ suggestion }}</span>?
        </div>
      </div>

      <!-- Switch Button -->
      <div class="switch-col">
        <button
            class="switch-btn"
            :class="{ rotating: isRotating }"
            @click="toggleMode"
            title="Richtung wechseln"
        >
          <canvas ref="canvasRef" width="24" height="24"></canvas>
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
import { ref, computed, onMounted, watch } from 'vue'

const persons = [
  { name: 'Müller',       title: 'Herr', short: 'Mü' },
  { name: 'Schmidt',      title: 'Frau', short: 'Sc' },
  { name: 'Schneider',    title: 'Herr', short: 'Sc' },
  { name: 'Fischer',      title: 'Frau', short: 'Fi' },
  { name: 'Weber',        title: 'Herr', short: 'We' },
  { name: 'Meyer',        title: 'Frau', short: 'Me' },
  { name: 'Wagner',       title: 'Herr', short: 'Wa' },
  { name: 'Becker',       title: 'Frau', short: 'Be' },
  { name: 'Schulz',       title: 'Herr', short: 'Sc' },
  { name: 'Hoffmann',     title: 'Frau', short: 'Ho' },
  { name: 'Schäfer',      title: 'Herr', short: 'Sc' },
  { name: 'Bauer',        title: 'Frau', short: 'Ba' },
  { name: 'Richter',      title: 'Herr', short: 'Ri' },
  { name: 'Klein',        title: 'Frau', short: 'Kl' },
  { name: 'Wolf',         title: 'Herr', short: 'Wo' },
  { name: 'Schröder',     title: 'Frau', short: 'Sc' },
  { name: 'Neumann',      title: 'Herr', short: 'Ne' },
  { name: 'Schwarz',      title: 'Frau', short: 'Sc' },
  { name: 'Zimmermann',   title: 'Herr', short: 'Zi' },
  { name: 'Braun',        title: 'Frau', short: 'Br' },
  { name: 'Krüger',       title: 'Herr', short: 'Kr' },
  { name: 'Hartmann',     title: 'Frau', short: 'Ha' },
  { name: 'Lange',        title: 'Herr', short: 'La' },
  { name: 'Schmitt',      title: 'Frau', short: 'Sc' },
  { name: 'Werner',       title: 'Herr', short: 'We' },
  { name: 'Krause',       title: 'Frau', short: 'Kr' },
  { name: 'Meier',        title: 'Herr', short: 'Me' },
  { name: 'Lehmann',      title: 'Frau', short: 'Le' },
  { name: 'Schmid',       title: 'Herr', short: 'Sc' },
  { name: 'Schulze',      title: 'Frau', short: 'Sc' },
  { name: 'Maier',        title: 'Herr', short: 'Ma' },
  { name: 'Köhler',       title: 'Frau', short: 'Kö' },
  { name: 'Herrmann',     title: 'Herr', short: 'He' },
  { name: 'König',        title: 'Frau', short: 'Kö' },
  { name: 'Walter',       title: 'Herr', short: 'Wa' },
  { name: 'Mayer',        title: 'Frau', short: 'Ma' },
  { name: 'Kaiser',       title: 'Herr', short: 'Ka' },
  { name: 'Fuchs',        title: 'Frau', short: 'Fu' },
  { name: 'Peters',       title: 'Herr', short: 'Pe' },
  { name: 'Keller',       title: 'Frau', short: 'Ke' },
  { name: 'Günther',      title: 'Herr', short: 'Gü' },
  { name: 'Voigt',        title: 'Frau', short: 'Vo' },
  { name: 'Horn',         title: 'Herr', short: 'Ho' },
  { name: 'Beck',         title: 'Frau', short: 'Be' },
  { name: 'Jung',         title: 'Herr', short: 'Ju' },
  { name: 'Frank',        title: 'Frau', short: 'Fr' },
  { name: 'Kranz',        title: 'Herr', short: 'Kr' },
  { name: 'Albrecht',     title: 'Frau', short: 'Al' },
  { name: 'Voß',          title: 'Herr', short: 'Vo' },
  { name: 'Seidel',       title: 'Frau', short: 'Se' },
  { name: 'Winkler',      title: 'Herr', short: 'Wi' },
  { name: 'Busch',        title: 'Frau', short: 'Bu' },
  { name: 'Kleinert',     title: 'Herr', short: 'Kl' },
  { name: 'Brandt',       title: 'Frau', short: 'Br' },
  { name: 'Stark',        title: 'Herr', short: 'St' },
  { name: 'Roth',         title: 'Frau', short: 'Ro' },
  { name: 'Vogel',        title: 'Herr', short: 'Vo' },
  { name: 'Jäger',        title: 'Frau', short: 'Jä' },
  { name: 'Otto',         title: 'Herr', short: 'Ot' },
  { name: 'Schuster',     title: 'Frau', short: 'Sc' },
  { name: 'Stein',        title: 'Herr', short: 'St' },
  { name: 'Berg',         title: 'Frau', short: 'Be' },
  { name: 'Baumann',      title: 'Herr', short: 'Ba' },
  { name: 'Ziegler',      title: 'Frau', short: 'Zi' },
  { name: 'Zimmer',       title: 'Herr', short: 'Zi' },
  { name: 'Kuhn',         title: 'Frau', short: 'Ku' },
  { name: 'Rudolf',       title: 'Herr', short: 'Ru' },
  { name: 'Marx',         title: 'Frau', short: 'Ma' },
  { name: 'Berger',       title: 'Herr', short: 'Be' },
  { name: 'Fink',         title: 'Frau', short: 'Fi' },
  { name: 'Arnold',       title: 'Herr', short: 'Ar' },
  { name: 'Winter',       title: 'Frau', short: 'Wi' },
  { name: 'Schwarzmann',  title: 'Herr', short: 'Sc' },
  { name: 'Abraham',      title: 'Frau', short: 'Ab' },
  { name: 'Appel',        title: 'Herr', short: 'Ap' },
  { name: 'Bender',       title: 'Frau', short: 'Be' },
  { name: 'Barth',        title: 'Herr', short: 'Ba' },
  { name: 'Baum',         title: 'Frau', short: 'Ba' },
  { name: 'Bock',         title: 'Herr', short: 'Bo' },
  { name: 'Döring',       title: 'Frau', short: 'Dö' },
  { name: 'Engel',        title: 'Herr', short: 'En' },
  { name: 'Faber',        title: 'Frau', short: 'Fa' },
  { name: 'Gärtner',      title: 'Herr', short: 'Gä' },
  { name: 'Hahn',         title: 'Frau', short: 'Ha' },
  { name: 'Ihle',         title: 'Herr', short: 'Ih' },
  { name: 'Jansen',       title: 'Frau', short: 'Ja' },
  { name: 'Klode',        title: 'Herr', short: 'Kl' },
  { name: 'Lenz',         title: 'Frau', short: 'Le' },
  { name: 'Maas',         title: 'Herr', short: 'Ma' },
  { name: 'Nestle',       title: 'Frau', short: 'Ne' },
  { name: 'Oster',        title: 'Herr', short: 'Os' },
  { name: 'Pohl',         title: 'Frau', short: 'Po' },
  { name: 'Quandt',       title: 'Herr', short: 'Qu' },
  { name: 'Rau',          title: 'Frau', short: 'Ra' },
  { name: 'Sohn',         title: 'Herr', short: 'So' },
  { name: 'Ullrich',      title: 'Frau', short: 'Ul' },
  { name: 'Vogt',         title: 'Herr', short: 'Vo' },
  { name: 'Warnke',       title: 'Frau', short: 'Wa' },
  { name: 'Xaver',        title: 'Herr', short: 'Xa' },
  { name: 'Yilmaz',       title: 'Frau', short: 'Yi' }
];



const mode = ref<'shortToName' | 'nameToShort'>('shortToName')
const inputValue = ref('')
const suggestion = ref('')
const canvasRef = ref<HTMLCanvasElement | null>(null)
const isRotating = ref(false)

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
  suggestion.value = ''

  if (!q) return ''

  if (mode.value === 'shortToName') {
    const match = persons.find(p => normalize(p.short) === q)
    return match ? `${match.title} ${match.name}` : ''
  } else {
    const match = persons.find(p => normalize(p.title + p.name) === q)
    if (match) return match.short

    let best: { person: any; score: number } | null = null
    persons.forEach(p => {
      const score = similarity(q, normalize(p.title + p.name))
      if (!best || score > best.score) {
        best = { person: p, score }
      }
    })
    if (best && best.score > 0.5) {
      suggestion.value = `${best.person.title} ${best.person.name}`
    }
    return ''
  }
})

function applySuggestion() {
  if (suggestion.value) {
    inputValue.value = suggestion.value
    suggestion.value = ''
  }
}

function toggleMode() {
  isRotating.value = true
  setTimeout(() => (isRotating.value = false), 500)

  mode.value = mode.value === 'shortToName' ? 'nameToShort' : 'shortToName'
  inputValue.value = ''
  drawIcon()
}

function drawIcon() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'

  // Halbkreis oben mit Pfeil
  ctx.beginPath()
  ctx.arc(12, 12, 9, Math.PI * 1.2, Math.PI * 0.1, false)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(20, 8)
  ctx.lineTo(23, 6)
  ctx.lineTo(22, 10)
  ctx.stroke()

  // Halbkreis unten mit Pfeil
  ctx.beginPath()
  ctx.arc(12, 12, 9, Math.PI * 1.2, Math.PI * 2.1, true)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(4, 16)
  ctx.lineTo(1, 18)
  ctx.lineTo(3, 14)
  ctx.stroke()
}

onMounted(() => {
  drawIcon()
})

watch(mode, () => {
  drawIcon()
})
</script>

<style scoped>
.row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center; /* sorgt für vertikale Zentrierung */
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
  width: 44px;   /* kleiner gemacht */
  height: 44px;  /* kleiner gemacht */
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.3s;
}
.switch-btn:hover {
  background: #ff6a00;
}
.switch-btn.rotating {
  animation: spin 0.5s linear;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
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
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #1f1f1f;
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
