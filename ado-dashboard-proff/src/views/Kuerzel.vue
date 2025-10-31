<template>
  <div class="card">
    <div class="card-top">
      <h2 style="margin-top:0; margin-bottom: 5px">Kürzelfinder</h2>
      <p style="margin-top: 2px" class="small">Finde ganz einfach heraus, welcher Name hinter welchem Kürzel steckt oder wer welches Kürzel hat.</p>
    </div>

    <div class="row">
      <!-- Input -->
      <div class="col">
        <small class="nwer">{{ mode==='shortToName' ? 'Kürzel' : 'Name' }}</small>
        <input
            v-model="inputValue"
            class="input"
            :placeholder="mode==='shortToName' ? 'z. B. AY...' : 'z. B. Frau Aydem...'"
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
        <!--<div class="mode-label">
          {{ mode==='shortToName' ? 'Kürzel → Name' : 'Name → Kürzel' }}
        </div>-->
      </div>

      <!-- Output -->
      <div class="col">
        <small class="nwer">{{ mode==='shortToName' ? 'Name' : 'Kürzel' }}</small>
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
import {ref, computed, onMounted} from 'vue'
import { supabase} from "../composables/Datatable";

const persons = ref([])



const loadPeople = async () => {
  const { data: persondata, error: personerror} = await supabase
      .from('persons')
      .select('*')
      .order('id')
  if (personerror) console.log(personerror)
  persons.value = persondata
  console.log(persondata)
  console.log(persons.value)

}



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

// Kuerzel.vue (Korrigierter computed-Abschnitt)

const outputValue = computed(() => {
  const q = normalize(inputValue.value)
  suggestions.value = []

  if (!q) return ''

  if (mode.value === 'shortToName') {
    // KORREKTUR: persons.value.find
    const match = persons.value.find(p => normalize(p.short) === q)
    return match ? `${match.title} ${match.name}` : ''
  } else {
    // exakter Treffer mit Anrede
    // KORREKTUR: persons.value.find
    const match = persons.value.find(p => normalize(p.title + p.name) === q)
    if (match) return match.short

    // exakter Treffer nur Nachname
    // KORREKTUR: persons.value.filter
    const matchesByName = persons.value.filter(p => normalize(p.name) === q)
    if (matchesByName.length === 1) {
      return matchesByName[0].short
    }
    if (matchesByName.length > 1) {
      suggestions.value = matchesByName
      return ''
    }

    // unscharfe Suche
    let bestScore = 0
    // KORREKTUR: persons.value.forEach
    persons.value.forEach(p => {
      const score = similarity(q, normalize(p.name))
      if (score > 0.6) {
        // Hier ist suggestions.value korrekt, da es eine separate ref ist
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


onMounted(() => {
  loadPeople();
})
</script>

<style scoped>

nwer {
}
.input {
  margin-top: 5px;
}
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
  background: #f1f1f1;
  color: #101010;
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
  background: #faf9f9;
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

@media (max-width: 400px) {
  .row {
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  
}
</style>





