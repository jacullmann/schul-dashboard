import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/common/composables/Datatable.ts'
import { normalize, similarity } from '@/modules/tools/utils/kuerzelHelper.ts'

interface Person {
    id: number
    short: string
    title: string
    name: string
}

const SHORT_EXAMPLES = ['HA', 'FS', 'AY', 'SM', 'AN'] as const
const NAME_EXAMPLES = ['Frau Haupt', 'Herr Fischer', 'Frau Aydem', 'Frau Simsek', 'Herr Al-Najjar'] as const

/** Minimum fuzzy-similarity score for a suggestion to be shown. */
const SUGGESTION_THRESHOLD = 0.6

export function useKuerzel() {
    // ─── State ───────────────────────────────────────────────────────────────

    const persons = ref<Person[]>([])
    const mode = ref<'shortToName' | 'nameToShort'>('shortToName')
    const inputValue = ref('')
    const isRotated = ref(false)

    const currentPlaceholder = ref('')
    const otherPlaceholder = ref('')

    // ─── Data loading ────────────────────────────────────────────────────────

    async function loadPeople() {
        const { data, error } = await supabase
            .from('persons')
            .select('*')
            .order('id')

        if (error) {
            console.error('Failed to load persons:', error)
            return
        }

        persons.value = data ?? []
    }

    // ─── Placeholder ─────────────────────────────────────────────────────────

    function setRandomPlaceholder() {
        const idx = Math.floor(Math.random() * SHORT_EXAMPLES.length)
        const short = SHORT_EXAMPLES[idx] ?? ''
        const name = NAME_EXAMPLES[idx] ?? ''

        if (mode.value === 'shortToName') {
            currentPlaceholder.value = `${short}...`
            otherPlaceholder.value = name
        } else {
            currentPlaceholder.value = `${name}...`
            otherPlaceholder.value = short
        }
    }

    // ─── Computed output + suggestions ───────────────────────────────────────

    /**
     * Reactive list of fuzzy-matched suggestions (only populated when there is
     * no exact match in name→short mode).  Sorted by descending similarity so
     * the best match comes first.
     */
    const suggestions = computed<Person[]>(() => {
        if (mode.value !== 'nameToShort') return []

        const q = normalize(inputValue.value)
        if (!q) return []

        // Exact full-name match → no suggestions needed
        if (persons.value.some(p => normalize(p.title + p.name) === q)) return []

        // Multiple last-name-only matches → surface them all, no fuzzy needed
        const byName = persons.value.filter(p => normalize(p.name) === q)
        if (byName.length > 1) return byName

        // Fuzzy: collect candidates above threshold and sort best-first
        return persons.value
            .map(p => ({ person: p, score: similarity(q, normalize(p.name)) }))
            .filter(({ score }) => score > SUGGESTION_THRESHOLD)
            .sort((a, b) => b.score - a.score)
            .map(({ person }) => person)
    })

    /** The resolved value shown in the read-only output field. */
    const outputValue = computed<string>(() => {
        const q = normalize(inputValue.value)
        if (!q) return ''

        if (mode.value === 'shortToName') {
            const match = persons.value.find(p => normalize(p.short) === q)
            return match ? `${match.title} ${match.name}` : ''
        }

        // Exact full-name match (title + name)
        const fullMatch = persons.value.find(p => normalize(p.title + p.name) === q)
        if (fullMatch) return fullMatch.short.toUpperCase()

        // Single last-name match
        const byName = persons.value.filter(p => normalize(p.name) === q)
        if (byName.length === 1) return byName[0]!.short.toUpperCase()

        return ''
    })

    // ─── Actions ─────────────────────────────────────────────────────────────

    function applySuggestion(person: Person) {
        inputValue.value = `${person.title} ${person.name}`
    }

    function toggleMode() {
        isRotated.value = !isRotated.value
        mode.value = mode.value === 'shortToName' ? 'nameToShort' : 'shortToName'
        inputValue.value = ''
        setRandomPlaceholder()
    }

    // ─── Lifecycle ───────────────────────────────────────────────────────────

    onMounted(() => {
        loadPeople()
        setRandomPlaceholder()
    })

    // ─── Public API ──────────────────────────────────────────────────────────

    return {
        persons,
        mode,
        inputValue,
        outputValue,
        suggestions,
        isRotated,
        currentPlaceholder,
        otherPlaceholder,
        applySuggestion,
        toggleMode,
    }
}