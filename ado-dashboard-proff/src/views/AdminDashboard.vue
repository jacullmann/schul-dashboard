<template>
  <div class="admin-layout">
    <div class="admin-header-sticky-wrapper">
      <AdminHeader />
    </div>
    <div class="main-content-wrapper">
      <AdminSidebar
          :activeTab="activeTab"
          @update:activeTab="activeTab = $event"
          :reportsCount="reports.length"
          :sorgenCount="entriessorgen.length"
      />
      <main class="content-area">
        <div class="content-header">
          <h1>{{ tabTitles[activeTab] }}</h1>
          <div v-if="message" class="status-message" :class="{ error: isError }">
            {{ message }}
          </div>
        </div>

        <div v-if="activeTab === 'overview'" class="tab-content fade-in">
          <div v-if="loadingStats" class="loader">Lade Statistik...</div>
          <div v-else-if="stats" class="stats-grid">
            <div class="stat-card">
              <div class="stat-val">{{ stats.userCount }}</div>
              <div class="stat-label">Registrierte Nutzer</div>
            </div>
            <div class="stat-card">
              <div class="stat-val">{{ stats.itemCount }}</div>
              <div class="stat-label">Aktive Einträge</div>
            </div>
            <div class="stat-card danger" v-if="stats.reportCount > 0">
              <div class="stat-val">{{ stats.reportCount }}</div>
              <div class="stat-label">Offene Meldungen</div>
            </div>
            <div class="stat-card warn" v-if="stats.bannedCount > 0">
              <div class="stat-val">{{ stats.bannedCount }}</div>
              <div class="stat-label">Gesperrte Nutzer</div>
            </div>
          </div>

          <div class="chart-section card rlc mt-4" v-if="stats">
            <h3>Einträge nach Art</h3>
            <div class="bar-chart">
              <div v-for="type in stats.itemsByType" :key="type._id" class="bar-row">
                <span class="bar-label">{{ type._id }}</span>
                <div class="bar-track">
                  <div class="bar-fill" :style="{ width: (type.count / stats.itemCount * 100) + '%' }"></div>
                </div>
                <span class="bar-val">{{ type.count }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'users'" class="tab-content fade-in">
          <div class="toolbar">
            <button class="btn ghost margin-bottom" @click="loadAllUsers">Aktualisieren</button>
            <div class="search-wrap">
            </div>
          </div>

          <div class="table-container card rlc">
            <table class="data-table">
              <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th>Kurse</th>
                <th>Erstellt</th>
                <th align="right">Aktionen</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="u in allUsers" :key="u.id" :class="{ banned: u.isBanned }">
                <td>
                  <div class="u-email">{{ u.email }}</div>
                  <div class="u-id small">{{ u.id }}</div>
                </td>
                <td>
                  <span v-if="u.isAdmin" class="badge admin-badge">Admin</span>
                  <span v-else-if="u.isBanned" class="badge danger-badge">Gesperrt</span>
                  <span v-else class="badge ok-badge">Aktiv</span>
                  <span v-if="!u.emailVerified" class="badge warn-badge ml-1">Unverifiziert</span>
                </td>
                <td class="small">
                  Enr: {{ u.enrKurs }} | WPU: {{ u.wpuKurs1 }}/{{ u.wpuKurs2 }} | Theater: {{u.theater }}
                </td>
                <td class="small">{{ new Date(u.createdAt).toLocaleDateString() }}</td>
                <td align="right">
                  <div class="actions">
                    <button class="btn icon-only" @click="toggleUserActivity(u.id)" title="Logs">
                      <FileText :size="16"/>
                    </button>
                    <button v-if="!u.isAdmin" class="btn icon-only" @click="toggleBan(u)" :title="u.isBanned ? 'Entsperren' : 'Sperren'">
                      <Lock v-if="!u.isBanned" :size="16"/>
                      <Unlock v-else :size="16"/>
                    </button>
                    <button
                        class="btn icon-only"
                        title="Logs älter als 30 Tage löschen"
                        @click="pruneOldLogs(u)"
                    >
                      <Eraser size="16" />
                    </button>
                    <button v-if="!u.isAdmin" class="btn icon-only danger" @click="deleteUser(u.id)" title="Löschen">
                      <Trash2 :size="16"/>
                    </button>
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>

          <Transition name="drawer-slide">
          <div v-if="showActivityFor" class="activity-drawer" @click.self="showActivityFor = null">
            <div class="drawer-content card rlc">
              <h3>Aktivitätsprotokoll</h3>
              <div v-if="loadingActivities[showActivityFor]" class="loader">Lade...</div>
              <ul v-else class="log-list">
                <li v-for="(act, i) in userActivities[showActivityFor]" :key="i">
                  <span class="log-time">{{ new Date(act.at).toLocaleString() }}</span>
                  <span class="log-type">{{ act.type }}</span>
                  <pre class="log-meta">{{ JSON.stringify(act.meta, null, 2) }}</pre>
                </li>
              </ul>
              <button class="btn ghost mt-4" @click="showActivityFor = null">Schließen</button>
            </div>
          </div>
          </Transition>
        </div>

        <div v-if="activeTab === 'reports'" class="tab-content fade-in">
          <div v-if="!reports.length" class="empty-state">Keine Meldungen vorhanden.</div>
          <div class="report-grid">
            <div v-for="rep in reports" :key="rep._id" class="report-card card rlc">
              <div class="rep-header">
                <strong>{{ rep.itemTitle }}</strong>
                <span class="small">{{ new Date(rep.reportedAt).toLocaleDateString() }}</span>
              </div>
              <div class="rep-category">
      <span class="badge" :class="rep.category === 'illegal' ? 'danger-badge' : 'warn-badge'">
          {{ rep.category === 'illegal' ? 'Illegal' : 'Falschinfo' }}
      </span>
              </div>
              <div class="rep-reason">"{{ rep.reason }}"</div>
              <div class="rep-meta small">
                Item ID: {{ rep.itemId }} <br>
                Von: {{ rep.reporterEmail }}
              </div>
              <div class="rep-actions">
                <button class="btn danger tiny" @click="deleteReport(rep._id)">Komplett weg</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'sorgen'" class="tab-content fade-in">
          <div v-if="!entriessorgen.length" class="empty-state">Der Kasten ist leer.</div>
          <div class="sorgen-list">
            <div v-for="s in entriessorgen" :key="s._id" class="sorge-card rlc card">
              <div class="sorge-body">{{ s.message }}</div>
              <div class="sorge-footer">
                <span class="small">{{ new Date(s.createdAt).toLocaleString() }}</span>
                <button class="btn danger tiny" @click="deleteSorge(s._id)">Löschen</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'security'" class="tab-content fade-in">
          <div class="security-tools card rlc">
            <h3>KI Sicherheits-Analyse</h3>
            <div class="row mt-4">
              <button class="btn primary" @click="generateSecurityReport" :disabled="isGeneratingReport">
                <span v-if="isGeneratingReport">Analysiere...</span>
                <span v-else>Bericht generieren</span>
              </button>
            </div>
          </div>

          <div v-if="reportError" class="message error mt-4">{{ reportError }}</div>

          <div v-if="securityReport" class="report-result card  rlc mt-4">
            <div class="report-toolbar">
              <h4>Ergebnis</h4>
              <button class="btn ghost tiny" @click="copyReportToClipboard">Kopieren</button>
            </div>
            <div class="markdown-body" v-html="marked.parse(securityReport)"></div>
          </div>
        </div>

        <div v-if="activeTab === 'announcements'" class="tab-content fade-in">
          <div class="card rlc">
            <h3>Neue Ankündigung</h3>
            <div class="row mt-4">
              <button class="btn" @click="showAnnouncementForm = true">Öffnen</button>
            </div>
          </div>
          <div class="card rlc">
            <div class="announcements" v-if="announcements.length">
              <div class="announcements-head">
                <h3>Ankündigungen</h3>
              </div>
              <div class="ann-list">
                <div v-for="a in announcements" :key="a._id" class="ann" :style="{ borderColor: colorFor(a.color) }">
                  <div class="ann-content">{{ a.content }}</div>
                  <div class="small ann-date">{{ new Date(a.createdAt).toLocaleString() }}</div>
                  <div v-if="canManage(a.createdBy)" class="ann-actions">
                    <button data-umami-event="Dashboard Admin Ankündigung löschen" class="btn danger tiny" @click="deleteAnnouncement(a._id)">Löschen</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'timetable'" class="tab-content fade-in">
          <div class="timetable-admin-grid">
            <!-- Linke Seite: EditModal -->
            <div class="timetable-edit-section card rlc">
              <h2>Neue Substitution erstellen</h2>
              <EditModal />
            </div>

            <div class="timetable-list-section card rlc">
              <div class="section-header">
                <h2>Gespeicherte Substitutions</h2>
                <button
                    class="btn ghost tiny"
                    @click="loadTimetableSubs"
                    :disabled="loadingSubs"
                >
                  {{ loadingSubs ? 'Lädt...' : 'Aktualisieren' }}
                </button>
              </div>

              <div v-if="loadingSubs" class="loader">Lade Substitutions...</div>

              <div v-else-if="!timetableSubs.length" class="empty-state">
                Keine Substitutions gespeichert
              </div>

              <div v-else class="subs-list">
                <div v-for="sub in timetableSubs" :key="sub._id" class="sub-item">
                  <div class="sub-info">
                    <div class="sub-header">
                      <strong>Lesson ID: {{ sub.lessonId }}</strong>
                      <span class="badge" :class="{
                                    'danger-badge': sub.cancelled,
                                    'warn-badge': sub.hide
                                }">
                                    {{ sub.cancelled ? 'Ausfall' : sub.hide ? 'Versteckt' : 'Änderung' }}
                                </span>
                    </div>

                    <div class="sub-details">
                                <span v-if="sub.subject">
                                    Fach: {{ sub.subject }}{{ sub.subject_abbr ? ` (${sub.subject_abbr})` : '' }}
                                </span>
                      <span v-if="sub.teacher">Lehrer: {{ sub.teacher }}</span>
                      <span v-if="sub.room">Raum: {{ sub.room }}</span>
                      <span v-if="sub.slot">Stunde: {{ sub.slot }}</span>
                      <span v-if="sub.day">Tag: {{ sub.day }}</span>
                    </div>

                    <div class="sub-meta small">
                      {{ new Date(sub.createdAt).toLocaleString() }}
                    </div>
                  </div>

                  <div class="sub-actions">
                    <button
                        class="btn icon-only danger"
                        @click="deleteTimetableSub(sub._id)"
                        :disabled="deletingSubs[sub._id]"
                        :title="deletingSubs[sub._id] ? 'Löscht...' : 'Löschen'"
                    >
                      <Trash2 :size="16"/>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <AnnouncementForm
        v-if="showAnnouncementForm"
        @close="showAnnouncementForm=false"
        @success="handleSuccess('Ankündigung erstellt')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAdmin } from '../composables/useAdmin';
import { useHausaufgaben} from "../composables/useHausaufgaben";
import AnnouncementForm from '../components/hw/AnnouncementForm.vue';
import AdminHeader from '../components/admin-components/AdminHeader.vue';
import AdminSidebar from '../components/admin-components//AdminSidebar.vue';
import { marked } from 'marked';
import {
  FileText,
  Lock,
  Unlock,
  Trash2,
  Eraser
} from 'lucide-vue-next';
import EditModal from "../components/stundenplan-admin/EditModal.vue";

const {
  activeTab,
  stats,
  loadingStats,
  loadAllUsers,
  allUsers,
  toggleUserActivity,
  showActivityFor,
  userActivities,
  loadingActivities,
  toggleBan,
  deleteUser,
  reports,
  deleteReport,
  entriessorgen,
  deleteSorge,
  generateSecurityReport,
  isGeneratingReport,
  securityReport,
  reportError,
  copyReportToClipboard,
  message,
  isError,
  handleSuccess,
  timetableSubs,
  loadingSubs,
  loadTimetableSubs,
  deleteTimetableSub,
  deletingSubs,
  pruneOldLogs,
} = useAdmin();

const {
  announcements,
  canManage,
  deleteAnnouncement,
  colorFor
} = useHausaufgaben();

const showAnnouncementForm = ref(false);

const tabTitles: Record<string, string> = {
  overview: 'Dashboard Übersicht',
  users: 'Benutzerverwaltung',
  reports: 'Gemeldete Inhalte',
  sorgen: 'Sorgenbox',
  security: 'Sicherheit',
  announcements: 'Ankündigungen',
  timetable: 'Stundenplan'
};
</script>

<style scoped>
.admin-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background:var(--bg);
  color:var(--text);
}

.admin-header-sticky-wrapper {
  position: sticky;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
}

.main-content-wrapper {
  display: flex;
  flex: 1;
  margin-left: 80px;
}

.content-area {
  flex: 1;
  padding: 30px 40px;
  overflow-y: auto;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}
.content-header h1 { margin: 0; font-size: 1.8rem; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-card {
  background: var(--card);
  border: 1px solid var(--border);
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}
.stat-card.danger { border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); }
.stat-card.warn { border-color: rgba(245, 158, 11, 0.3); background: rgba(245, 158, 11, 0.05); }

.stat-val { font-size: 2.5rem; font-weight: 700; margin-bottom: 5px; }
.stat-label { color: #888; font-size: 0.9rem; }

.table-container { overflow-x: auto; padding: 0; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}
.data-table th {
  background: var(--lbg);
  color: var(--sub);
  font-weight: 500;
  font-size: 0.85rem;
}
.u-email { font-weight: 500; }
.u-id { color: var(--sub); font-size: 0.7rem; }
.actions { display: flex; gap: 4px; justify-content: flex-end; }
.icon-only { padding: 6px; background: transparent; color: var(--sub); }
.icon-only:hover { color: var(--text); background: var(--gg); }
.icon-only.danger:hover { color: var(--danger); background: rgba(239, 68, 68, 0.1); }

.badge { padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
.ok-badge { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.warn-badge { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.danger-badge { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

.activity-drawer {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1000000000000000000000000000000000000000000000000000000000;
  display: flex;
  justify-content: flex-end;
}
.drawer-content {
  width: 400px;
  background: var(--lbg);
  border-left: 1px solid var(--border);
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  border-radius: 0;
  transition: transform 0.3s ease;
}
.drawer-slide-enter-from .drawer-content {
  transform: translateX(100%);
}
.drawer-slide-leave-to .drawer-content {
  transform: translateX(100%);
}
.drawer-slide-enter-active {
  transition: opacity 0.3s ease;
}
.drawer-slide-enter-from {
  opacity: 0;
}
.drawer-slide-leave-active {
  transition: opacity 1s;
}
.drawer-slide-leave-to {
  opacity: 0;
}

.log-list { list-style: none; padding: 0; }
.log-list li { border-bottom: 1px solid var(--border); padding: 10px 0; }
.log-time { color: var(--sub); font-size: 0.8rem; display: block; }
.log-type {  font-weight: 500; }
.log-meta {
  background: var(--vlbg);
  padding: 5px;
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--sub);
  margin-top: 4px;
  overflow-x: auto;
}

.report-grid, .sorgen-list { display: grid; gap: 15px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
.sorge-card, .report-card { display: flex; flex-direction: column; height: 100%; }
.sorge-body, .rep-reason { flex: 1; margin-bottom: 10px; line-height: 1.5; color: var(--text); } /* WICHTIG: var(--text) statt #ddd */
.sorge-footer, .rep-meta { border-top: 1px solid var(--border); padding-top: 10px; display: flex; justify-content: space-between; align-items: center; color: var(--sub); font-size: 0.8rem; }
.rep-header { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid var(--border); padding-bottom: 5px; }

.bar-row { display: flex; align-items: center; margin-bottom: 8px; font-size: 0.9rem; }
.bar-label { width: 100px; color: var(--sub); }
.bar-track { flex: 1; height: 8px; background: var(--border); border-radius: 4px; margin: 0 10px; overflow: hidden; }
.bar-fill { height: 100%; background: var(--lp); border-radius: 4px; }
.bar-val { width: 30px; text-align: right; font-weight: bold; }

.mt-4 { margin-top: 1rem; }
.ml-1 { margin-left: 0.25rem; }
.status-message { padding: 10px; border-radius: 6px; background: rgba(16, 185, 129, 0.2); color: #10b981; margin-bottom: 20px; }
.status-message.error { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
.loader { color: #666; padding: 20px; text-align: center; }
.margin-bottom {
  margin-bottom: 10px;
}

@media (max-width: 1024px) {
  .admin-layout {
    flex-direction: column;
  }
  .main-content-wrapper {
    flex-direction: column;
    margin-left: 0;
  }
  .content-area {
    padding: 20px;
  }
}
.timetable-admin-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.timetable-edit-section {
  max-height: 1000px;
  overflow-y: auto;
}

.timetable-list-section {
  max-height: 1000px;
  overflow-y: auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.subs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sub-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px;
  background: var(--vlbg);
  border: 1px solid var(--border);
  border-radius: 8px;
  transition: background 0.2s;
}

.sub-item:hover {
  background: var(--s-hover);
}

.sub-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.sub-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 0.85rem;
  color: var(--sub);
}

.sub-details span {
  display: inline-block;
  padding-right: 12px;
  border-right: 1px solid var(--border);
}

.sub-details span:last-child {
  border-right: none;
}

.sub-meta {
  color: var(--sub2);
}

.sub-actions {
  display: flex;
  gap: 4px;
}

@media (max-width: 1024px) {
  .timetable-admin-grid {
    grid-template-columns: 1fr;
  }
}
</style>