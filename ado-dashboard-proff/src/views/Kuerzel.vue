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
