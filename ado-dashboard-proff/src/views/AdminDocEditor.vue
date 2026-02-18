<template>
  <div class="doc-editor-page">

    <div class="doc-statusbar">
      <div class="status-left">
        <div class="connection-badge" :class="connectionState">
          <span class="dot"></span>
          <span class="label">
            {{ connectionLabels[connectionState] }}
          </span>
        </div>

        <div v-if="isConnected && onlineAdmins.length > 0" class="online-admins">
          <span class="online-label">Online:</span>
          <span
              v-for="email in onlineAdmins"
              :key="email"
              class="admin-chip"
              :title="email"
          >
            {{ emailToInitials(email) }}
          </span>
        </div>
      </div>

      <div class="status-right">
        <span v-if="lastEditedBy" class="last-edit">
          Zuletzt von <strong>{{ lastEditedBy }}</strong>
          <template v-if="lastEditedAt">
            &nbsp;· {{ formatTime(lastEditedAt) }}
          </template>
        </span>

        <span class="version-badge" title="Dokument-Version">
          v{{ docVersion }}
        </span>

        <button
            class="save-btn"
            @click="saveNow"
            :disabled="isSaving || !isConnected"
            :title="isSaving ? 'Wird gespeichert…' : 'Jetzt speichern'"
        >
          <Save :size="14" />
          {{ isSaving ? 'Speichern…' : 'Speichern' }}
        </button>
      </div>
    </div>

    <Transition name="banner">
      <div v-if="conflictDetected" class="conflict-banner">
        <AlertTriangle :size="14" />
        Deine Version scheint veraltet zu sein. Wir haben sie mit dem neuen Stand aktualisiert.
      </div>
    </Transition>

    <Transition name="banner">
      <div v-if="saveError" class="error-banner">
        <AlertCircle :size="14" />
        {{ saveError }}
      </div>
    </Transition>

    <div class="editor-layout">

      <aside class="outline-sidebar">
        <div class="outline-header">
          <h3>Menü</h3>
          <button class="reset-btn" @click="confirmReset">
            <RotateCcw :size="13" />
          </button>
        </div>
        <div class="outline-body">
          <div v-if="toc.length === 0" class="toc-empty">
            Füge Überschriften hinzu, um die Gliederung zu sehen.
          </div>
          <div
              v-for="item in toc"
              :key="item.id"
              class="toc-item"
              :class="`level-${item.level}`"
              @click="scrollToBlock(item.id)"
          >
            <span class="toc-badge">{{ ['H1','H2','H3','H4'][item.level - 1] }}</span>
            <span class="toc-text">{{ item.text || '(Ohne Titel)' }}</span>
          </div>
        </div>
      </aside>

      <main class="editor-main">

        <div class="editor-toolbar">
          <div class="toolbar-left">
            <span class="toolbar-label">Block hinzufügen</span>
            <button @click="addBlock('h1')" title="Überschrift 1">
              <Heading1 :size="15" />
            </button>
            <button @click="addBlock('h2')" title="Überschrift 2">
              <Heading2 :size="15" />
            </button>
            <button @click="addBlock('p')" title="Absatz">
              <Type :size="15" />
            </button>
            <button @click="addBlock('ul')" title="Aufzählungsliste">
              <List :size="15" />
            </button>
            <button @click="addBlock('cl')" title="Checkliste">
              <CheckSquare :size="15" />
            </button>
            <div class="tb-separator"></div>

            <button @click="execOnFocused('bold')" title="Fett (Strg+B)" :disabled="!currentFocusId">
              <Bold :size="15" />
            </button>

            <div class="color-menu-wrapper" :class="{ disabled: !currentFocusId }">
              <button class="color-menu-btn" title="Textfarbe">
                <Palette :size="15" />
                <ChevronDown :size="11" />
              </button>
              <div class="color-menu-dropdown">
                <div v-for="c in TOOLBAR_COLORS" :key="c" class="color-dot"
                     :style="{ backgroundColor: c }" @click="execOnFocused('foreColor', c)"></div>
                <label class="color-dot custom" title="Eigene Farbe">
                  <input type="color" @input="(e: any) => execOnFocused('foreColor', e.target.value)" />
                </label>
              </div>
            </div>

            <select class="type-select" :disabled="!currentFocusId"
                    :value="currentBlockType"
                    @change="changeCurrentBlockType(($event.target as HTMLSelectElement).value)">
              <option value="p">Text</option>
              <option value="h1">Überschrift 1</option>
              <option value="h2">Überschrift 2</option>
              <option value="h3">Überschrift 3</option>
              <option value="ul">Liste</option>
              <option value="cl">Checkliste</option>
            </select>
          </div>
          <div class="toolbar-right">
            <span class="toolbar-hint">Tab = Einrücken &nbsp;|&nbsp; Shift+Tab = Ausrücken</span>
          </div>
        </div>

        <div class="document-scroll-area" id="doc-scroll-area">
          <div class="document-inner">

            <VueDraggableNext
                v-model="blocks"
                handle=".drag-handle"
                animation="180"
                ghost-class="ghost-block"
                @start="isDragging = true"
                @end="onDragEnd"
            >
              <TransitionGroup name="block-list" tag="div">
                <div
                    v-for="(block, index) in blocks"
                    :key="block.id"
                    v-show="isBlockVisible(block.id)"
                >
                  <PlanBlock
                      :block="block"
                      @update:content="(c) => updateBlockContent(block, c)"
                      @update:checked="(c) => updateBlockChecked(block, c)"
                      @toggle-collapse="toggleCollapse(block)"
                      @keydown-enter="handleEnter(index, $event)"
                      @keydown-backspace="handleBackspace(index, $event)"
                      @indent="handleIndent(block, 1)"
                      @outdent="handleIndent(block, -1)"
                      @delete="removeBlock(block.id)"
                      @focus="currentFocusId = block.id"
                      @change-type="(t) => changeBlockType(block, t)"
                  />
                </div>
              </TransitionGroup>
            </VueDraggableNext>

            <div
                v-if="blocks.length === 0"
                class="empty-doc"
                @click="addBlock('h1')"
            >
              <FileText :size="32" class="empty-icon" />
              <span>Klicke hier, um mit dem Schreiben zu beginnen</span>
            </div>

            <div class="doc-spacer"></div>
          </div>
        </div>

      </main>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { VueDraggableNext } from 'vue-draggable-next';
import {
  ChevronDown, Bold, Palette, Save, AlertTriangle, AlertCircle, RotateCcw,
  Heading1, Heading2, Type, List, CheckSquare, FileText
} from 'lucide-vue-next';

import PlanBlock from '@/components/PlanBlock.vue';
import { useDocEditor } from '@/composables/useDocEditor';
const TOOLBAR_COLORS = ['#000000','#ffffff','#d32f2f','#f57c00','#388e3c','#1976d2','#7b1fa2'];

type BlockType = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'ul' | 'cl';

interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
  isCollapsed?: boolean;
  indentLevel: number;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

const {
  connectionState,
  docContent,
  docVersion,
  lastEditedBy,
  lastEditedAt,
  onlineAdmins,
  isSaving,
  saveError,
  conflictDetected,
  isConnected,
  connect,
  onContentChange,
  saveNow,
  loadDoc,
} = useDocEditor();

const currentBlockType = computed(() => {
  if (!currentFocusId.value) return 'p';
  return blocks.value.find(b => b.id === currentFocusId.value)?.type ?? 'p';
});

function execOnFocused(command: string, value?: string) {
  const el = document.getElementById(`block-input-${currentFocusId.value}`);
  if (!el) return;
  el.focus();
  document.execCommand(command, false, value);
  const block = blocks.value.find(b => b.id === currentFocusId.value);
  if (block) { block.content = el.innerHTML; pushBlocksToServer(); }
}

function changeCurrentBlockType(type: string) {
  const block = blocks.value.find(b => b.id === currentFocusId.value);
  if (block) changeBlockType(block, type);
}

// Lokaler Block-State
const blocks = ref<Block[]>([]);
const currentFocusId = ref<string | null>(null);
let selfUpdateTimer: ReturnType<typeof setTimeout> | null = null;
let isSelfUpdate = false;

// --- Serialization/Deserialization (Kept same as provided) ---
function serializeBlocks(blocks: Block[]): string {
  return blocks.map(b => {
    // Standardize attributes
    const indent = b.indentLevel ? ` data-indent="${b.indentLevel}"` : '';
    const collapsed = b.isCollapsed ? ` data-collapsed="true"` : '';
    const checked = b.checked ? ` data-checked="true"` : '';
    const bid = ` data-bid="${b.id}"`; // The most important part
    const type = ` data-type="${b.type}"`;

    // Wrap content in the appropriate tag
    switch (b.type) {
      case 'h1': return `<h1${bid}${type}${indent}${collapsed}>${b.content}</h1>`;
      case 'h2': return `<h2${bid}${type}${indent}${collapsed}>${b.content}</h2>`;
      case 'h3': return `<h3${bid}${type}${indent}${collapsed}>${b.content}</h3>`;
      case 'h4': return `<h4${bid}${type}${indent}${collapsed}>${b.content}</h4>`;
      case 'ul': return `<ul${bid}${type}${indent}><li>${b.content}</li></ul>`;
      case 'cl': return `<div class="cl-block"${bid}${type}${indent}${checked}>${b.content}</div>`;
      default:   return `<p${bid}${type}${indent}>${b.content}</p>`;
    }
  }).join('\n');
}

function deserializeBlocks(html: string): Block[] {
  if (!html.trim()) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.querySelector('div')!;

  return Array.from(root.children).map((el, index) => {
    const tag = el.tagName.toLowerCase();

    // 1. Get the ID.
    // FALLBACK: If data-bid is missing, use a index-based ID so it stays
    // the same for this specific render cycle.
    const bid = el.getAttribute('data-bid') || `temp-id-${index}`;

    const dataType = el.getAttribute('data-type');
    const indent = parseInt(el.getAttribute('data-indent') || '0', 10);
    const collapsed = el.getAttribute('data-collapsed') === 'true';

    let type: BlockType = 'p';
    if (dataType && ['h1','h2','h3','h4','p','ul','cl'].includes(dataType)) {
      type = dataType as BlockType;
    } else if (['h1','h2','h3','h4','p'].includes(tag)) {
      type = tag as BlockType;
    }

    let content = (type === 'ul')
        ? (el.querySelector('li')?.innerHTML || el.innerHTML)
        : el.innerHTML;

    return {
      id: bid,
      type,
      content,
      checked: el.getAttribute('data-checked') === 'true',
      isCollapsed: collapsed,
      indentLevel: isNaN(indent) ? 0 : indent,
    };
  });
}

// Replace your existing watcher with this:
watch(docContent, (newHtml) => {
  // 1. Compare semantic content to avoid loop if nothing actually changed
  const currentHtml = serializeBlocks(blocks.value);
  if (currentHtml === newHtml) return;

  // 2. Only deserialize if it's truly an external update
  // (Ideally, your backend should send a 'senderId' so you know if IT WAS YOU)
  if (isSelfUpdate) return;

  const parsed = deserializeBlocks(newHtml);

  // 3. SMART MERGE (Optional but recommended):
  // Instead of replacing the whole array (which kills DOM focus),
  // try to update only changed blocks by ID if possible.
  // For now, simple replacement:
  blocks.value = parsed;
}, { immediate: false });

// Improve the "Lock" mechanism
// Instead of a timer, use a flag that resets only on the next tick after a save
function pushBlocksToServer() {
  const html = serializeBlocks(blocks.value);

  // Don't send if nothing changed (avoids loops)
  if (html === docContent.value) return;

  isSelfUpdate = true;
  onContentChange(html);

  // We expect the 'docContent' watcher to fire soon with this same HTML.
  // We keep the lock open until we verify the content matches or a timeout occurs.
  // (A simpler robust way for Vue local state is usually to NOT update local state
  // from props if the user is currently typing/focused).
}

function genId(): string {
  return Math.random().toString(36).slice(2, 11);
}
function getLevel(type: string): number {
  return { h1: 1, h2: 2, h3: 3, h4: 4 }[type] ?? 10;
}
function isHeader(type: string): boolean {
  return ['h1','h2','h3','h4'].includes(type);
}

// --- FIX: Visibility Logic moved to function for v-show ---
// Calculates visibility set based on collapsed parents
const visibleBlockIds = computed(() => {
  const ids = new Set<string>();
  let hideLevel = 999;

  for (const block of blocks.value) {
    const level = getLevel(block.type);

    // If we find a header that is higher level (lower number) than current hideLevel, reset hiding
    if (level < 999 && level <= hideLevel) {
      hideLevel = 999;
    }

    if (hideLevel === 999) {
      ids.add(block.id);
      // If this is a header and collapsed, start hiding everything below it
      if (isHeader(block.type) && block.isCollapsed) {
        hideLevel = level;
      }
    }
  }
  return ids;
});

const isDragging = ref(false);

// Update isBlockVisible
function isBlockVisible(id: string) {
  // ALWAYS show all blocks while dragging to prevent index misalignment
  if (isDragging.value) return true;
  return visibleBlockIds.value.has(id);
}

const toc = computed<TocItem[]>(() => {
  return blocks.value
      .filter(b => isHeader(b.type))
      .map(b => {
        const tmp = document.createElement('div');
        tmp.innerHTML = b.content;
        return {
          id: b.id,
          text: tmp.textContent?.trim() || '',
          level: getLevel(b.type),
        };
      });
});

function addBlock(type: BlockType = 'p') {
  const block: Block = {
    id: genId(),
    type,
    content: '',
    checked: false,
    isCollapsed: false,
    indentLevel: 0,
  };
  blocks.value.push(block);
  pushBlocksToServer();
  focusBlock(block.id);
}

function removeBlock(id: string) {
  const idx = blocks.value.findIndex(b => b.id === id);
  if (idx === -1) return;
  if (idx > 0) focusBlock(blocks.value[idx - 1].id);
  blocks.value.splice(idx, 1);
  pushBlocksToServer();
}

function updateBlockContent(block: Block, content: string) {
  block.content = content;
  pushBlocksToServer();
}
function updateBlockChecked(block: Block, checked: boolean) {
  block.checked = checked;
  pushBlocksToServer();
}
function changeBlockType(block: Block, type: string) {
  block.type = type as BlockType;
  pushBlocksToServer();
}
function toggleCollapse(block: Block) {
  block.isCollapsed = !block.isCollapsed;
  pushBlocksToServer();
}
function handleIndent(block: Block, delta: number) {
  const next = block.indentLevel + delta;
  if (next >= 0 && next <= 8) {
    block.indentLevel = next;
    pushBlocksToServer();
  }
}
function handleEnter(index: number, e: KeyboardEvent) {
  e.preventDefault();
  // With the new flat list + v-show structure, 'index' is the real index in 'blocks'
  const block = blocks.value[index];

  let nextType: BlockType = 'p';
  if (block.type === 'ul') nextType = 'ul';
  if (block.type === 'cl') nextType = 'cl';

  const newBlock: Block = {
    id: genId(),
    type: nextType,
    content: '',
    checked: false,
    indentLevel: block.indentLevel,
  };

  blocks.value.splice(index + 1, 0, newBlock);
  pushBlocksToServer();
  nextTick(() => focusBlock(newBlock.id));
}

function handleBackspace(index: number, e: KeyboardEvent) {
  const block = blocks.value[index];
  if (block.content === '' && blocks.value.length > 1) {
    e.preventDefault();
    removeBlock(block.id);
  }
}

function onDragEnd() {
  isDragging.value = false; // Collapse states return to normal
  pushBlocksToServer();
}

function focusBlock(id: string) {
  nextTick(() => {
    const el = document.getElementById(`block-input-${id}`);
    if (!el) return;
    el.focus();
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
  });
}

function scrollToBlock(id: string) {
  document.getElementById(`block-wrapper-${id}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });
}

function confirmReset() {
  if (confirm('Dokument wirklich leeren?')) {
    blocks.value = [];
    pushBlocksToServer();
  }
}

const connectionLabels: Record<string, string> = {
  connecting: 'Verbinde…',
  connected: 'Live verbunden',
  disconnected: 'Getrennt',
  error: 'Auth-Fehler',
};

function emailToInitials(email: string): string {
  const local = email.split('@')[0];
  const parts = local.split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}
function formatTime(iso: string): string {
  try { return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso)); } catch { return ''; }
}

onMounted(async () => {
  await loadDoc();
  if (docContent.value) blocks.value = deserializeBlocks(docContent.value);
  connect();
});
</script>

<style scoped>
/* =========================================
   Main Layout & Structure
   ========================================= */
.doc-editor-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.editor-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.editor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* =========================================
   Status Bar
   ========================================= */
.doc-statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--lbg);
  border-bottom: 1px solid var(--border);
  gap: 12px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* Connection Badges */
.connection-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-footnote);
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 20px;
  background: var(--gg);
}

.connection-badge .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.connection-badge.connected {
  background: rgba(56, 142, 60, 0.15);
  color: #388e3c;
}

.connection-badge.connected .dot {
  background: #388e3c;
  box-shadow: 0 0 0 2px rgba(56, 142, 60, 0.3);
}

.connection-badge.connecting {
  background: rgba(245, 124, 0, 0.12);
  color: #f57c00;
}

.connection-badge.connecting .dot {
  background: #f57c00;
  animation: pulse 1s infinite;
}

.connection-badge.disconnected {
  background: var(--gg);
  color: var(--sub);
}

.connection-badge.disconnected .dot {
  background: var(--sub);
}

.connection-badge.error {
  background: rgba(211, 47, 47, 0.12);
  color: #d32f2f;
}

.connection-badge.error .dot {
  background: #d32f2f;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* Status Bar Components */
.online-admins {
  display: flex;
  align-items: center;
  gap: 4px;
}

.online-label {
  font-size: var(--font-size-footnote);
  color: var(--sub);
}

.admin-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--ghost--hover);
  color: var(--text);
  font-size: 10px;
  font-weight: 700;
  border: 2px solid var(--bg);
  cursor: default;
}

.last-edit {
  font-size: var(--font-size-footnote);
  color: var(--sub);
}

.version-badge {
  font-size: var(--font-size-footnote);
  color: var(--sub);
  background: var(--gg);
  padding: 2px 8px;
  border-radius: 10px;
}

.save-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: var(--border-4);
  border: 1px solid var(--border);
  background: var(--lbg);
  color: var(--text);
  font-size: var(--font-size-footnote);
  cursor: pointer;
  transition: background 0.15s;
}

.save-btn:hover:not(:disabled) {
  background: var(--ghost--hover);
}

.save-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Banners */
.conflict-banner,
.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: var(--font-size-sub);
  flex-shrink: 0;
}

.conflict-banner {
  background: rgba(245, 124, 0, 0.1);
  color: #f57c00;
  border-bottom: 1px solid rgba(245, 124, 0, 0.2);
}

.error-banner {
  background: rgba(211, 47, 47, 0.1);
  color: #d32f2f;
  border-bottom: 1px solid rgba(211, 47, 47, 0.2);
}

.banner-enter-active,
.banner-leave-active {
  transition: all 0.25s ease;
}

.banner-enter-from,
.banner-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* =========================================
   Sidebar & Outline
   ========================================= */
.outline-sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--vlbg);
  border-right: 1px solid var(--border2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.outline-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border2);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.outline-header h3 {
  margin: 0;
  font-size: var(--font-size-body);
  font-weight: 600;
  color: var(--text);
}

.reset-btn {
  background: none;
  border: none;
  color: var(--sub);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
}

.reset-btn:hover {
  color: var(--danger);
  background: rgba(246, 82, 82, 0.08);
}

.outline-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.toc-empty {
  font-size: var(--font-size-footnote);
  color: var(--sub);
  font-style: italic;
  padding: 10px;
}

.toc-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: var(--font-size-sub);
  color: var(--text);
  transition: background 0.15s;
  margin-bottom: 1px;
}

.toc-item:hover {
  background: var(--gg);
}

.toc-badge {
  font-size: 9px;
  font-weight: 700;
  opacity: 0.5;
  width: 18px;
  flex-shrink: 0;
}

.toc-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.level-1 { padding-left: 8px; font-weight: 600; }
.level-2 { padding-left: 20px; }
.level-3 { padding-left: 32px; }
.level-4 { padding-left: 44px; }

/* =========================================
   Editor Toolbar
   ========================================= */
.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  background: var(--vlbg);
  border-bottom: 1px solid var(--border2);
  flex-shrink: 0;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 2px;
}

.toolbar-label {
  font-size: var(--font-size-footnote);
  font-weight: 600;
  color: var(--sub);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-right: 8px;
}

.toolbar-left button {
  background: none;
  border: none;
  padding: 7px;
  border-radius: var(--border-4);
  cursor: pointer;
  color: var(--sub);
  display: flex;
  align-items: center;
}

.toolbar-left button:hover {
  background: var(--gg);
  color: var(--text);
}

.toolbar-left button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.toolbar-hint {
  font-size: var(--font-size-footnote);
  color: var(--sub);
}

.tb-separator {
  width: 1px;
  height: 18px;
  background: var(--border2, #ddd);
  margin: 0 6px;
  flex-shrink: 0;
}

.type-select {
  background: var(--gg, #f0f0f0);
  color: var(--text, #333);
  border: 1px solid var(--border, #ddd);
  border-radius: var(--border-4, 4px);
  font-size: 12px;
  padding: 5px 6px;
  cursor: pointer;
  outline: none;
  margin-left: 4px;
}

.type-select:hover:not(:disabled) {
  background: var(--ghost--hover, #e8e8e8);
}

.type-select:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* =========================================
   Color Menu (Dropdown Logic)
   ========================================= */
.color-menu-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.color-menu-wrapper.disabled {
  opacity: 0.35;
  pointer-events: none;
}

.color-menu-btn {
  display: flex;
  align-items: center;
  gap: 2px;
  background: none;
  border: none;
  padding: 6px 7px;
  border-radius: var(--border-4, 4px);
  cursor: pointer;
  color: var(--sub);
}

.color-menu-btn:hover {
  background: var(--gg);
  color: var(--text);
}

.color-menu-dropdown {
  display: none;
  position: absolute;
  left: 0;
  z-index: 500;
  /* Visual styling */
  background: var(--lbg, #fff);
  border: 1px solid var(--border, #ddd);
  border-radius: 8px;
  padding: 8px;
  gap: 5px;
  flex-wrap: wrap;
  width: 128px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  /* Positioning with bridge gap */
  top: calc(100% + 6px);
}

.color-menu-wrapper:hover .color-menu-dropdown {
  display: flex;
}

/* Invisible bridge to prevent mouse leaving the hover area */
.color-menu-dropdown::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 0;
  width: 100%;
  height: 8px;
  background: transparent;
}

.color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
  flex-shrink: 0;
}

.color-dot:hover {
  transform: scale(1.2);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.color-dot.custom {
  display: flex;
  align-items: center;
  justify-content: center;
  background: conic-gradient(red, yellow, lime, cyan, blue, magenta, red);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  position: relative;
  overflow: hidden;
}

.color-dot.custom input[type="color"] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
  display: block;
  visibility: visible;
}

/* =========================================
   Document Content Area
   ========================================= */
.document-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 40px 48px;
  background: var(--bg);
  scroll-behavior: smooth;
}

.document-inner {
  max-width: 780px;
  margin: 0 auto;
  min-height: 500px;
  position: relative;
}

:deep(.ghost-block) {
  opacity: 0.35;
  background: var(--gg) !important;
}

.block-list-move,
.block-list-enter-active,
.block-list-leave-active {
  transition: all 0.18s ease;
}

.block-list-enter-from,
.block-list-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

.empty-doc {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 200px;
  border: 2px dashed var(--border2);
  border-radius: 8px;
  color: var(--sub);
  cursor: pointer;
  margin-top: 24px;
  font-size: var(--font-size-body);
  transition: border-color 0.2s, color 0.2s;
}

.empty-doc:hover {
  border-color: var(--text);
  color: var(--text);
}

.empty-icon {
  opacity: 0.4;
}

.doc-spacer {
  height: 200px;
}

/* =========================================
   Media Queries
   ========================================= */
@media (max-width: 900px) {
  .outline-sidebar {
    display: none;
  }
  .document-scroll-area {
    padding: 24px 20px;
  }
}
</style>