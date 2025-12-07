<template>
  <div class="card">
    <div class="hw-header">
      <div>
        <h2>Dashboard</h2>
        <div style="color: #f1f1f1" class="small">Arbeite kollaborativ mit anderen und behalte alle Aufgaben im Blick.</div>
      </div>

      <div class="row header-actions">
        <AccountMenu
            v-if="user"
            :email="user.email"
            :user-data="user"
            @deleted="onAccountDeleted"
            @error="onAccountDeleteError"
            @open-setup="openSetupModal"
            @logout="logout"
        />
        <button data-umami-event="Dashboard Anmelden/Registrieren Button" class="btn ghost" v-else @click="showAuth = true">Anmelden/Registrieren</button>
      </div>
    </div>

    <!-- Ankündigungen: Nur Lesen hier, Erstellen im AdminDashboard -->
    <div class="announcements" v-if="announcements.length">
      <div class="announcements-head">
        <h3>Wichtige Ankündigungen</h3>
      </div>
      <div class="ann-list">
        <div v-for="a in announcements" :key="a._id" class="ann" :style="{ borderColor: colorFor(a.color) }">
          <div class="ann-content">{{ a.content }}</div>
          <div class="small ann-date">{{ new Date(a.createdAt).toLocaleString() }}</div>
          <!-- Admin kann hier löschen oder im Dashboard. Wir lassen es hier der Einfachheit halber drin -->
          <div v-if="canManage(a.createdBy)" class="ann-actions">
            <button data-umami-event="Dashboard Admin Ankündigung löschen" class="btn danger tiny" @click="deleteAnnouncement(a._id)">Löschen</button>
          </div>
        </div>
      </div>
    </div>

    <div class="tabs-row">
      <button data-umami-event="Dashboard Hausaufgaben Reiter" class="btn rei" :class="{ ghost: tab !== 'HAUSAUFGABE' }" @click="goTab('HAUSAUFGABE')">Hausaufgaben</button>
      <button data-umami-event="Dashboard Dalton Reiter" class="btn rei" :class="{ ghost: tab !== 'DALTON' }" @click="goTab('DALTON')">Dalton</button>
      <button data-umami-event="Dashboard Prüfung Reiter" class="btn rei" :class="{ ghost: tab !== 'PRUEFUNG' }" @click="goTab('PRUEFUNG')">Prüfungen</button>
      <button data-umami-event="Dashboard Private Einträge Reiter" class="btn rei" :class="{ ghost: tab !== 'PRIVATE' }" @click="goTab('PRIVATE')">Private Einträge</button>
    </div>

    <div class="controls">
      <div class="left">
        <div v-if="tab !== 'PRIVATE'" class="row-two">
          <select class="input select-subject" v-model="subjectFilter">
            <option value="">Alle Fächer</option>
            <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
          </select>
          <OldNewSwitch v-model="showOldEntries" />
          <button
              v-if="user && user.doneSetup"
              class="btn"
              :class="{ 'ghost': !showPersonalized }"
              @click="showPersonalized = !showPersonalized"
              title="Filtert Enrichment und WPU Kurse"
          >
            <span style="color: black" v-if="showPersonalized">Alle Einträge anzeigen</span>
            <span v-else>Personalisierte Einträge anzeigen</span>
          </button>
        </div>

        <button v-if="user && tab !== 'PRIVATE'" class="btn mg ghost" @click="openCreateForm">Eintrag anlegen</button>

        <div v-if="loading && tab !== 'PRIVATE'" class="loader">
          <LoadingSpinner color="#fff" size="1.2em" />
          <div style="color: #aaaaaa">Lade...</div>
        </div>
      </div>

      <div v-if="message" class="small message" :class="{ error: isError }">{{ message }}</div>
    </div>

    <div class="items">
      <div
          v-if="tab !== 'PRIVATE'"
          v-for="item in limitedItems"
          :key="item.id"
          class="item-card"
          :class="{ collapsed: isChecked(item.id) }"
      >
        <!-- Item Content (unverändert) -->
        <div class="item-main">
          <div class="item-meta">
            <div style="display:flex; align-items:center; gap:8px;">
              <label class="collapse-checkbox" v-if="user">
                <input type="checkbox" :checked="isChecked(item.id)" @change="toggleCheck(item)" />
                <span class="vis-label"></span>
              </label>

              <h3 class="item-title" :title="item.title">{{ item.title }}</h3>
            </div>

            <div class="row item-badges" :class="{ collapsed: isChecked(item.id) }">
              <div class="badge subject-badge">{{ item.subject }}</div>
              <div class="badge time-badge" :style="colorStyles(item.timeColor)">
                {{ new Date(item.dueDate).toLocaleDateString() }}
              </div>
              <div v-if="user?.isAdmin" class="admin-creator-info">
                {{ item.createdByEmail || 'Unbekannt' }}
              </div>
            </div>
          </div>

          <div class="item-menu-trigger" role="button" tabindex="0" @click.stop="toggleMenu(item.id)">
            <Ellipsis />
          </div>

          <div class="item-menu" :class="{ open: openMenuId === item.id }" @click.stop>
            <button class="menu-btn" v-if="user" @click="onMenuAction('images', item)">
              <div class="fixall"><Images /> Bilder</div>
            </button>
            <button class="menu-btn" v-if="canManage(item.createdBy)" @click="onMenuAction('edit', item)">
              <div class="fixall"><Pencil /> Bearbeiten</div>
            </button>
            <button class="menu-btn" title="Melden" @click="onMenuAction('report', item)">
              <div class="fixall"><Flag /> Melden</div>
            </button>
            <button class="menu-btn danger" v-if="canManage(item.createdBy)" @click="onMenuAction('delete', item)">
              <div class="fixall"><Trash2 /> Löschen</div>
            </button>
          </div>
        </div>

        <transition name="collapse">
          <div v-show="!isChecked(item.id)" class="item-body">
            <span v-if="!isExpanded(item.id)">{{ item.description.slice(0, 200) }}<span v-if="item.description.length > 200">…</span></span>
            <span v-else>{{ item.description }}</span>
            <button v-if="item.description.length > 200" class="btn tiny ghost" @click="toggleDescription(item.id)" style="margin-left:8px;">
              {{ isExpanded(item.id) ? 'Weniger anzeigen' : 'Alles anzeigen' }}
            </button>
          </div>
        </transition>

        <transition name="collapse">
          <div v-if="item.images && item.images.length && !isChecked(item.id)" class="item-images">
            <!-- Images rendering logic retained -->
            <div class="images-row">
              <template v-if="!isRevealed(item.id)">
                <div v-for="(img, idx) in item.images.slice(0, 2)" :key="img.publicId" class="thumb thumb-with-overlay-wrapper">
                  <a :href="img.url" target="_blank"><img :src="img.thumbUrl || makeThumb(img.url)" loading="lazy"/></a>
                  <button v-if="idx === 1 && item.images.length > 2" class="img-overlay" @click.stop.prevent="revealImages(item.id)">
                    <div class="overlay-blur"></div><div class="overlay-content">+{{ item.images.length - 1 }}</div>
                  </button>
                </div>
              </template>
              <template v-else>
                <div v-for="img in item.images" :key="img.publicId" class="thumb">
                  <a :href="img.url" target="_blank"><img :src="img.thumbUrl || makeThumb(img.url)" loading="lazy"/></a>
                </div>
              </template>
            </div>
          </div>
        </transition>
      </div>

      <div v-if="tab === 'PRIVATE'" class="private-entries-container"><TodoApp /></div>
      <div v-if="!loading && !limitedItems.length && filteredItems.length" class="card empty">Keine Einträge in der aktuellen Ansicht.</div>
      <div v-if="!loading && !filteredItems.length" class="card empty">Keine Einträge gefunden.</div>

      <div v-if="filteredItems.length > 5" class="pagination-actions">
        <button v-if="visibleCount < filteredItems.length" class="btn ghost" @click="showMore">Mehr anzeigen</button>
        <button v-if="visibleCount > 5" class="btn ghost" @click="showLess">Weniger anzeigen</button>
      </div>


    </div>

    <!-- Modals -->
    <AuthModal v-if="showAuth" @close="showAuth=false" @logged-in="onLoggedIn" />
    <ItemForm v-if="showItemForm" :key="itemFormKey" :type="tab" :subjects="subjects" :initial="itemToEdit" :max-title-length="MAX_TITLE_LENGTH" :max-subject-length="MAX_SUBJECT_LENGTH" @close="showItemForm=false" @success="handleSuccess('Eintrag wurde erfolgreich erstellt.')" @error="onItemFormError" />
    <ImageForm v-if="showImageFormFor" :item="showImageFormFor" @close="showImageFormFor=null" @success="handleSuccess('Bilder aktualisiert.')" />
    <ConfirmDialog
        :show="showReportConfirm"
        message=""
        :show-reason-input="true"
        v-model:reason="reportReason"
        @confirm="doReport"
        @cancel="cancelReport"
    />
    <CompleteSetup v-if="user" :visible="showSetupModal" :is-setup="user && !user.doneSetup" :initial-data="{ enrKurs: user.enrKurs || 0, wpuKurs1: user.wpuKurs1 || 0, wpuKurs2: user.wpuKurs2 || 0, theater: user.theater || 0 }" @close="showSetupModal = false" @success="onSetupSuccess" @update:user="onSetupSuccess" />
  </div>
</template>

<script setup lang="ts">
import AuthModal from '../components/hw/AuthModal.vue';
import ItemForm from '../components/hw/ItemForm.vue';
import ImageForm from '../components/hw/ImageForm.vue';
import AccountMenu from '../components/hw/AccountMenu.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue'
import LoadingSpinner from "../components/LoadingSpinner.vue";
import OldNewSwitch from "../components/NewOldSwitch.vue"
import CompleteSetup from "../components/hw/CompleteSetup.vue";
import TodoApp from "./TodoApp.vue";
import { Flag, Pencil, Images, Trash2, Ellipsis } from 'lucide-vue-next'
import { useHausaufgaben } from '../composables/useHausaufgaben';

const {
  MAX_TITLE_LENGTH, MAX_SUBJECT_LENGTH, showAuth, showItemForm, showImageFormFor,
  itemToEdit, user, subjects, announcements, items, loading, subjectFilter, showPersonalized,
  showOldEntries, showSetupModal, message, isError, itemFormKey, visibleCount, limitedItems,
  filteredItems, showReportConfirm, reportReason, tab, openMenuId, isExpanded, toggleDescription,
  showMore, showLess, colorFor, colorStyles, toggleMenu, onMenuAction, onAccountDeleted,
  onAccountDeleteError, openSetupModal, logout, onLoggedIn, handleSuccess, onItemFormError,
  openCreateForm, canManage, deleteAnnouncement, goTab, isChecked, toggleCheck, makeThumb,
  isRevealed, revealImages, onSetupSuccess, doReport, cancelReport
} = useHausaufgaben();
</script>

<style scoped>
.hw-header { display: flex; justify-content: space-between; gap: 12px; flex-direction: column; text-align: left; }
.hw-header h2 { margin: 0 0 2px 0}
.header-actions { align-items: center; display: flex; flex-direction: row; flex-wrap: wrap}
.announcements { margin-top: 18px; }
.announcements-head { display:flex; justify-content:space-between; align-items:center; gap:12px; }
.ann-list { margin-top: 12px; }
.ann { border-radius: 10px; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); position: relative; overflow: hidden; }
.ann + .ann { margin-top: 10px; }
.ann-content { white-space: pre-wrap; color: var(--text); }
.ann-date { color: var(--muted); }
.ann-actions { margin-top: 8px; }
.tabs-row { display:flex; gap:8px; margin: 16px 0;  flex-wrap: wrap;flex-direction: row }
.controls { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; }
.controls .left { display:flex; gap:8px; align-items:center; flex-wrap:wrap; height: 100% }
.select-subject { width:auto; min-width:160px; border: 1px solid var(--border2); padding: 10px 14px; background: #282828;}
.items { margin-top: 18px; display:flex; flex-direction:column; gap:12px; }
.item-card { border-radius: 12px; padding: 12px; background: var(--vlbg); border: 1px solid var(--border2); transition: transform 150ms ease; overflow: visible; }
.item-card.collapsed { transition: padding 300ms cubic-bezier(0.78, 0, 0.22, 1), max-height 300ms cubic-bezier(0.78, 0, 0.22, 1); }
.item-main { position: relative; display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
.item-meta { flex:1; min-width: 0; }
.item-title { margin:-2px 0; font-size:1.125rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; line-height: 22px;}
.collapse-checkbox { display:inline-flex; align-items:center; margin-right:2px; cursor:pointer; }
.collapse-checkbox input { display:none; }
.collapse-checkbox .vis-label { width:18px; height:18px; border-radius:4px; border: 2px solid #aaa;; display:inline-block; background:transparent; position:relative; }
.collapse-checkbox input:checked + .vis-label { background: var(--primary); border-color: var(--primary); }
.collapse-checkbox .vis-label:hover {
  border-color: #f1f1f1;
}
.collapse-checkbox .vis-label::after { content: ''; position: absolute; width: 5px; height: 10px; border: solid #f1f1f1; border-width: 0 2px 2px 0; opacity: 0; left: 50%; top: 32%; transform: translate(-50%, -45%) rotate(45deg); }
.collapse-checkbox input:checked + .vis-label::after { opacity:1; }
.item-badges { margin-top:4px; gap:8px; align-items:center; }
.subject-badge { background:#414141; color:white; padding:4px 8px; border-radius:6px; }
.time-badge { padding:4px 8px; border-radius:6px; }
.item-menu { position: absolute; top: 100%; right: 0; min-width: 105px; background: #282828; border: 1px solid var(--border2); border-radius: 12px; padding:8px; display: none; flex-direction: column; align-items: stretch; gap: 5px; z-index: 1000; opacity: 0; transform: translateY(-6px) scale(0.98); pointer-events: none; transition: opacity 160ms ease, transform 160ms ease; margin-bottom: 0; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3); }
.item-menu.open { display: flex; opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
.menu-btn { display: block; width: 100%; text-align: left; background: transparent; border: none; padding: 6px 9px; color: var(--text); border-radius: 8px; cursor: pointer; font-size: 16px; transition: background 0.2s ease; }
.menu-btn .fixall { display: flex; align-items: center; gap: 9px; line-height: 1; }
.menu-btn .fixall svg { width: 18px; height: 18px; flex-shrink: 0; }
.menu-btn:hover { background: rgba(255, 255, 255, 0.1); }
.menu-btn.danger { color: #f65252; fill: #f65252; }
.menu-btn.danger:hover { background:rgba(246, 82, 82, 0.1); }
.item-body { margin-top:10px; color: var(--text); word-break: break-word; overflow-wrap: anywhere; hyphens: auto; }
.item-images { margin-top:12px; }
.images-title { font-weight:600; margin-bottom:8px; }
.images-row { display:flex; flex-wrap:wrap; gap:8px; position:relative; }
.thumb { width:120px; height:120px; border-radius:8px; overflow:hidden; border:none; display:flex; align-items:center; justify-content:center; background: rgba(0,0,0,0.12); position:relative; }
.thumb img { width:100%; height:100%; object-fit:cover; display:block; }
.thumb-with-overlay-wrapper { position: relative; }
.img-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px; border: none; padding: 0; margin: 0; cursor: pointer; background: transparent; z-index: 10; }
.img-overlay .overlay-blur {
  position: absolute;
  inset: 0;
  background: #282828aa;
  border-radius: 8px;
}
.img-overlay .overlay-content {
  position: relative;
  color: var(--text);
  font-weight: 400;
  font-size: 32px;
  z-index: 11;
  pointer-events: none;
}
.empty { text-align:center; color:var(--muted); padding:24px; border: none }
.collapse-enter-active, .collapse-leave-active { transition: max-height 300ms cubic-bezier(0.78, 0, 0.22, 1), opacity 300ms cubic-bezier(0.78, 0, 0.22, 1), padding 300ms cubic-bezier(0.78, 0, 0.22, 1); }
.collapse-enter-from, .collapse-leave-to { max-height: 0; opacity: 0; padding-top: 0; padding-bottom: 0; }
.collapse-enter-to, .collapse-leave-from { max-height: 800px; opacity: 1; }
.message { font-weight:600; white-space: normal; overflow-wrap: break-word; word-break: break-all; }
.message.error { color: var(--danger); }
.tiny { padding:4px 8px; font-size:12px; }
.item-menu-trigger { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 24px; padding: 6px 8px; border-radius: 6px; cursor: pointer; color: #aaaaaa; transition: background 120ms ease, color 120ms ease; margin: -3px -2px; }
.item-menu-trigger:hover { background: #414141; color: #f1f1f1; }
.pagination-actions { margin-top: 16px; display: flex; gap: 12px; justify-content: center; }
.loader { display: flex; align-items: center; gap: 8px; color: var(--muted); }
.row-two { max-height: 80px; display: flex; align-items: center; justify-content: center; flex-direction: row; gap: 8px; position: relative; }
.private-entries-container { margin-top: 1rem; }
.private-entries-container .card { margin: 0; box-shadow: none; background: transparent; }
.private-entries-container .hw-header { padding: 0; background: transparent; }
.select-subject { max-width: 30px; width: 100%; display: inline-block; box-sizing: border-box; }
.select-subject { max-width: 160px; min-width: auto; width: auto; }
.select-subject:hover {
  background: var(--s-hover);
  cursor: pointer;
}
.admin-creator-info { color: #aaa; }
.row.item-badges {
  transition: opacity 300ms cubic-bezier(0.78, 0, 0.22, 1),
  max-height 300ms cubic-bezier(0.78, 0, 0.22, 1),
  margin-top 300ms cubic-bezier(0.78, 0, 0.22, 1);
  opacity: 1;
  max-height: 50px;
  margin-top: 8px;
}

.row.item-badges.collapsed {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  overflow: hidden;
}
@media (max-width: 768px) {
  /* Anpassungen */
}
@media (max-width: 500px ) {
  .row-two { flex-direction: column; align-items: flex-start; margin-top: 15px; margin-bottom: 30px; }
  .mg { margin-top: 20px; }
  .thumb { aspect-ratio: 1 / 1; width: calc(50% - 4px); border-radius: 8px; overflow: hidden; position: relative; height: auto; display: block; }
}
</style>