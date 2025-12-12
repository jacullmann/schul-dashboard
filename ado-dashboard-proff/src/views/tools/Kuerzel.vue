<template>
  <div class="card">
    <div class="card-top">
      <h2 style="margin-top:0" class="title-inf">
        Kürzelfinder
        <InfoPop tooltip="Kürzelfinder Info" title="Kürzelfinder">
          <p>Finde ganz einfach heraus, welcher Name hinter welchem Kürzel steckt oder wer welches Kürzel hat.</p>

          <h3>Kürzelübersetzer</h3>
          <p>Gib das unbekannte Kürzel in das Textfeld ein und erhalte den zugehörigen Namen.</p>

          <h3>Kürzelfinder</h3>
          <p>Klicke auf das Tauschsymbol, um den Modus zu wechseln. Nun kannst du einen Namen eingeben und erhältst das passende Kürzel.</p>
          <div class="info-img-container">
          <img alt="Bild" class="info-img border-normal" src="https://res.cloudinary.com/dwysdpvcm/image/upload/v1765474358/K%C3%BCrzelfinder_Grafik_vw3do2.webp" />
          </div>


        </InfoPop>
      </h2>
    </div>

    <div class="row">
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

      <div class="switch-col">
        <button
            class="switch-btn"
            :class="{ rotated: isRotated }"
            @click="toggleMode"
            data-umami-event="Kürzel Richtung Switch "
        >
          <ArrowLeftRight class="switch-icon" />
        </button>
        <!--<div class="mode-label">
          {{ mode==='shortToName' ? 'Kürzel → Name' : 'Name → Kürzel' }}
        </div>-->
      </div>

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
import { supabase} from "../../composables/Datatable";
import { ArrowLeftRight} from "lucide-vue-next";
import InfoPop from '../../components/info/InfoModalCenter.vue'

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

const outputValue = computed(() => {
  const q = normalize(inputValue.value)
  suggestions.value = []

  if (!q) return ''

  if (mode.value === 'shortToName') {
    const match = persons.value.find(p => normalize(p.short) === q)
    return match ? `${match.title} ${match.name}` : ''
  } else {
    const match = persons.value.find(p => normalize(p.title + p.name) === q)
    if (match) return match.short.toUpperCase()

    const matchesByName = persons.value.filter(p => normalize(p.name) === q)
    if (matchesByName.length === 1) {
      return matchesByName[0].short.toUpperCase()
    }
    if (matchesByName.length > 1) {
      suggestions.value = matchesByName
      return ''
    }

    let bestScore = 0
    persons.value.forEach(p => {
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


onMounted(() => {
  loadPeople();
})
</script>

<style scoped>

.input {
  margin-top: 5px;
}
.row {
  display: flex;
  gap: 0 8px;
  flex-wrap: wrap;
  align-items: center;
}
.col {
  flex: 1;
}
.switch-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.switch-btn {
  background: var(--jj);
  border: 1px solid var(--border2);
  border-radius: 6px;
  width: 38px;
  height: 38px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s ease;
  margin: 16px 0 -8px 0;
}

.switch-btn:hover {
  border: 1px solid var(--border2);
}


.switch-icon {
  width: 22px;
  height: 22px;
  color: #aaa;
  transition: color 0.3s ease, transform 0.3s ease;
}

.switch-btn:hover .switch-icon {
  color: #f1f1f1;
}

.switch-btn.rotated .switch-icon {
  transform: rotate(180deg);
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

@media (max-width: 600px) {
  .row {
    flex-direction: column;
    align-items: stretch;
  }
  .col {
    width: 100%;
    padding: 0;
  }
}
</style>





