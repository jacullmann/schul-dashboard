<!-- src/views/BigListInfinite.vue -->
<template>
  <div class="card">
    <h1>Unendliche Produktliste (DummyJSON, smooth)</h1>

    <RecycleScroller
        :items="items"
        :item-size="80"
        key-field="id"
        class="scroller"
        v-slot="{ item, index }"
        @scroll="onScroll"
    >
      <div class="row-item">
        <span class="index">#{{ index + 1 }}</span>
        <img :src="item.thumbnail" alt="" class="thumb" />
        <span class="content">
          <strong>{{ item.title }}</strong><br />
          <span class="price">{{ item.price }} €</span>
        </span>
      </div>
    </RecycleScroller>

    <div v-if="loading" class="loading">Lade weitere Produkte…</div>
  </div>
</template>

<script setup lang="ts">
import { RecycleScroller } from 'vue3-virtual-scroller'
import 'vue3-virtual-scroller/dist/vue3-virtual-scroller.css'
import { ref, onMounted } from 'vue'

interface Product {
  id: number
  title: string
  price: number
  thumbnail: string
}

const items = ref<Product[]>([])
const loading = ref(false)
const limit = 20
let skip = 0
let idOffsetBase = 0

async function fetchBatch() {
  const res = await fetch(`https://dummyjson.com/products?limit=${limit}&skip=${skip}`)
  const data = await res.json()
  skip += limit
  return (data.products ?? []).map((p: any) => ({
    id: idOffsetBase + p.id,
    title: p.title,
    price: p.price,
    thumbnail: p.thumbnail
  }))
}

async function loadMore() {
  if (loading.value) return
  loading.value = true
  try {
    const batch = await fetchBatch()
    if (batch.length > 0) {
      items.value.push(...batch)
    } else {
      // Wenn API am Ende ist: von vorne beginnen, IDs verschieben
      skip = 0
      idOffsetBase += 100000
      const again = await fetchBatch()
      items.value.push(...again)
    }
  } catch (err) {
    console.error('Fehler beim Laden:', err)
  } finally {
    loading.value = false
  }
}

// Scroll-Handler: lädt nach, wenn man im unteren Drittel ist
function onScroll(e: Event) {
  const el = e.target as HTMLElement
  const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 5 * 80 * limit
  if (nearBottom && !loading.value) {
    loadMore()
  }
}

onMounted(() => {
  // Initial zwei Batches laden, damit man sofort „Vorlauf“ hat
  loadMore()
  loadMore()
})
</script>

<style scoped>
.scroller {
  height: 600px;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow-y: auto;
  background: var(--card);
}

.row-item {
  display: flex;
  align-items: center;
  height: 80px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu;
  gap: 12px;
}

.index {
  width: 60px;
  color: var(--muted);
}

.thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #fff;
}

.content {
  flex: 1;
}

.price {
  color: var(--primary);
}

.loading {
  margin-top: 12px;
  text-align: center;
  color: var(--muted);
}
</style>
