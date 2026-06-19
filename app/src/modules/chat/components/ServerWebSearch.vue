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
  <form novalidate @submit.prevent="search">
    <BaseBackdrop @cancel="emit('cancel')">
      <div class="fixed w-full h-full md:p-4 md:h-fit md:w-[640px] z-[20000]">
        <!-- Header: Search Bar -->
        <div
          class="w-full h-full bg-canvas md:border border-ghost-border md:rounded-2xl overflow-hidden flex flex-col"
        >
          <div class="flex items-center gap-3 p-4 border-b border-ghost-border">
            <Search :size="20" class="text-on-ghost-subtle flex-shrink-0" />
            <input
              id="search-input"
              ref="inputRef"
              v-model="searchQuery"
              type="text"
              placeholder="Search Wikipedia..."
              autocomplete="off"
              spellcheck="false"
              class="flex-1 w-full p-0 rounded-none bg-transparent border-none outline-none shadow-none text-on-ghost text-base/4 placeholder:text-on-ghost-subtle"
            />
            <BaseButton
              type="button"
              variant="ghost"
              :icon="X"
              class="-m-2"
              @click="emit('cancel')"
            />
          </div>

          <div class="flex-1 overflow-y-auto max-h-[640px] custom-scrollbar">
            <template v-if="currentView === 'results'">
              <div v-if="loading" class="p-8 text-center text-on-ghost-subtle">
                <BaseSpinner on="ghost" size="24" />
                <p>Searching Wikipedia...</p>
              </div>

              <div
                v-else-if="searchResults.length === 0 && searchQuery"
                class="p-8 text-center text-on-ghost-subtle"
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
                  class="p-3 rounded-lg hover:bg-surface-hover transition-colors group text-left"
                  @click="viewArticle(result.pageid, result.title)"
                >
                  <div
                    class="text-on-ghost font-medium mb-1 group-hover:text-primary transition-colors flex items-center justify-between"
                  >
                    <span>{{ result.title }}</span>
                    <span class="text-xs text-on-ghost-muted italic font-normal"
                      >{{ result.wordcount }} words</span
                    >
                  </div>
                  <div
                    class="text-on-ghost-muted text-sm line-clamp-2"
                    v-html="result.snippet"
                  ></div>
                </button>
              </div>

              <div v-else class="p-8 text-center text-on-ghost-subtle">
                Type something to search on Wikipedia
              </div>
            </template>

            <template v-else-if="currentView === 'article'">
              <div class="p-4 relative">
                <button
                  class="mb-4 text-primary hover:text-primary-hover flex items-center gap-1 text-sm font-medium transition-colors"
                  @click="currentView = 'results'"
                >
                  <ChevronLeft :size="16" /> Back to results
                </button>

                <div
                  v-if="articleLoading"
                  class="p-8 text-center text-on-ghost-subtle"
                >
                  <BaseSpinner on="ghost" size="24" />
                </div>

                <div v-else class="article-content">
                  <h1
                    class="text-2xl/tight font-bold mb-6 text-on-ghost px-2 border-l-4 border-primary"
                  >
                    {{ articleTitle }}
                  </h1>
                  <div
                    class="text-on-ghost leading-relaxed [&_p]:mb-4 [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-3 [&_h2]:text-[1.25rem] [&_h2]:border-b [&_h2]:border-ghost-border [&_h2]:pb-2 [&_h3]:text-[1.125rem] [&_ul]:mb-4 [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:pl-6 [&_li]:mb-1 [&_a]:text-primary [&_a]:no-underline hover:[&_a]:underline [&_.mw-editsection]:hidden [&_.navbox]:hidden [&_.ambox]:hidden [&_.infobox]:hidden [&_.metadata]:hidden [&_.searchmatch]:font-bold [&_.searchmatch]:text-on-ghost"
                    v-html="articleContent"
                  ></div>
                </div>
              </div>
            </template>
          </div>

          <div
            class="px-4 py-2.5 border-t border-ghost-border flex items-center gap-4 text-xs text-on-ghost-muted"
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
