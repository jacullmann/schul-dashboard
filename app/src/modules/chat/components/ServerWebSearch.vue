<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { Search, ChevronLeft, X } from '@lucide/vue';
import { useEventListener } from '@vueuse/core';

const inputRef = ref<HTMLInputElement | null>(null);
const searchQuery = ref('');
const searchResults = ref<any[]>([]);
const loading = ref(false);

const currentView = ref<'results' | 'article'>('results');
const articleContent = ref('');
const articleTitle = ref('');
const articleLoading = ref(false);

const emit = defineEmits(['cancel', 'searching']);

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('cancel');
  }
});

async function search() {
  if (!searchQuery.value.trim()) return;

  emit('searching');
  currentView.value = 'results';
  loading.value = true;
  try {
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        searchQuery.value,
      )}&format=json&origin=*`,
    );
    const data = await response.json();
    searchResults.value = data.query?.search || [];
  } catch (error) {
    console.error('Search error:', error);
  } finally {
    loading.value = false;
  }
}

async function viewArticle(pageid: number, title: string) {
  currentView.value = 'article';
  articleTitle.value = title;
  articleLoading.value = true;
  articleContent.value = '';

  try {
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=parse&pageid=${pageid}&prop=text&format=json&origin=*&disableeditsections=1&mobileformat=1`,
    );
    const data = await response.json();
    articleContent.value =
      data.parse?.text['*'] || 'Could not load article content.';
  } catch (error) {
    console.error('Error fetching article:', error);
    articleContent.value = 'Failed to load article content.';
  } finally {
    articleLoading.value = false;
  }
}

onMounted(() => {
  setTimeout(() => inputRef.value?.focus(), 50);
});
</script>

<template>
  <form @submit.prevent="search" novalidate>
    <BaseBackdrop @cancel="emit('cancel')">
      <div class="fixed w-full h-full md:p-4 md:h-fit md:w-160 z-20000">
        <!-- Header: Search Bar -->
        <div
          class="w-full h-full bg-canvas md:border border-canvas-border md:rounded-2xl overflow-hidden flex flex-col"
        >
          <div
            class="flex items-center gap-3 p-4 border-b border-canvas-border"
          >
            <Search :size="20" class="text-on-surface-subtle shrink-0" />
            <input
              id="search-input"
              ref="inputRef"
              v-model="searchQuery"
              type="text"
              placeholder="Search Wikipedia..."
              autocomplete="off"
              spellcheck="false"
              class="flex-1 w-full p-0 leading-4 rounded-none bg-transparent border-none outline-none shadow-none text-on-surface text-body placeholder:text-on-surface-subtle"
            />
            <BaseButton
              type="button"
              variant="ghost"
              on="canvas"
              :icon="X"
              class="-m-2"
              @click="emit('cancel')"
            />
          </div>

          <!-- Body: Search Results / Article Content -->
          <div class="flex-1 overflow-y-auto max-h-160 custom-scrollbar">
            <template v-if="currentView === 'results'">
              <div
                v-if="loading"
                class="p-8 text-center text-on-surface-subtle"
              >
                <BaseSpinner on="ghost" size="24" />
                <p>Searching Wikipedia...</p>
              </div>

              <div
                v-else-if="searchResults.length === 0 && searchQuery"
                class="p-8 text-center text-on-surface-subtle"
              >
                No results found for "{{ searchQuery }}"
              </div>

              <div
                v-else-if="searchResults.length > 0"
                class="p-2 flex flex-col gap-1"
              >
                <button
                  v-for="result in searchResults"
                  :key="result.pageid"
                  type="button"
                  @click="viewArticle(result.pageid, result.title)"
                  class="p-3 rounded-lg hover:bg-surface-hover transition-colors group text-left"
                >
                  <div
                    class="text-on-surface font-medium mb-1 group-hover:text-primary transition-colors flex items-center justify-between"
                  >
                    <span>{{ result.title }}</span>
                    <span
                      class="text-xs text-on-surface-muted italic font-normal"
                      >{{ result.wordcount }} words</span
                    >
                  </div>
                  <div
                    class="text-on-surface-muted text-sm line-clamp-2"
                    v-html="result.snippet"
                  ></div>
                </button>
              </div>

              <div v-else class="p-8 text-center text-on-surface-subtle">
                Type something to search on Wikipedia
              </div>
            </template>

            <template v-else-if="currentView === 'article'">
              <div class="p-4 relative">
                <button
                  @click="currentView = 'results'"
                  class="mb-4 text-primary hover:text-primary-hover flex items-center gap-1 text-sm font-medium transition-colors"
                >
                  <ChevronLeft :size="16" /> Back to results
                </button>

                <div
                  v-if="articleLoading"
                  class="p-8 text-center text-on-surface-subtle"
                >
                  <BaseSpinner on="ghost" size="24" />
                  <p>Loading article...</p>
                </div>

                <div v-else class="article-content">
                  <h1
                    class="text-2xl font-bold mb-6 text-on-surface px-2 border-l-4 border-primary leading-tight"
                  >
                    {{ articleTitle }}
                  </h1>
                  <div
                    class="wikipedia-body text-on-surface leading-relaxed"
                    v-html="articleContent"
                  ></div>
                </div>
              </div>
            </template>
          </div>

          <!-- Footer: Navigation Hint -->
          <div
            class="px-4 py-2.5 border-t border-canvas-border flex items-center gap-4 text-footnote text-on-surface-muted"
          >
            <BaseRow>
              <BaseKbd>↑</BaseKbd>
              <BaseKbd>↓</BaseKbd>
              to navigate
            </BaseRow>
            <BaseRow>
              <BaseKbd>↵</BaseKbd>
              to open
            </BaseRow>
            <BaseRow>
              <BaseKbd>Esc</BaseKbd>
              to close
            </BaseRow>
          </div>
        </div>
      </div>
    </BaseBackdrop>
  </form>
</template>

<style scoped>
.wikipedia-body :deep(p) {
  margin-bottom: 1rem;
}

.wikipedia-body :deep(h1),
.wikipedia-body :deep(h2),
.wikipedia-body :deep(h3) {
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  color: var(--on-surface);
}

.wikipedia-body :deep(h2) {
  font-size: 1.25rem;
  border-bottom: 1px solid var(--surface-border);
  padding-bottom: 0.5rem;
}

.wikipedia-body :deep(h3) {
  font-size: 1.125rem;
}

.wikipedia-body :deep(ul),
.wikipedia-body :deep(ol) {
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

.wikipedia-body :deep(li) {
  margin-bottom: 0.25rem;
}

.wikipedia-body :deep(a) {
  color: var(--primary);
  text-decoration: none;
}

.wikipedia-body :deep(a:hover) {
  text-decoration: underline;
}

/* Hide unwanted Wikipedia elements */
.wikipedia-body :deep(.mw-editsection),
.wikipedia-body :deep(.navbox),
.wikipedia-body :deep(.ambox),
.wikipedia-body :deep(.infobox),
.wikipedia-body :deep(.metadata) {
  display: none !important;
}

.wikipedia-body :deep(.searchmatch) {
  font-weight: 700;
  color: var(--on-surface);
}
</style>
