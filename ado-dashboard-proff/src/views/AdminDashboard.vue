<template>
  <div class="admin-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2>Admin</h2>
      </div>

      <nav class="sidebar-nav">
        <button
            @click="activeTab = 'overview'"
            :class="{ active: activeTab === 'overview' }"
            class="nav-item"
        >
          <LayoutDashboard :size="18" /> Übersicht
        </button>
        <button
            @click="activeTab = 'users'"
            :class="{ active: activeTab === 'users' }"
            class="nav-item"
        >
          <Users :size="18" /> Benutzer
        </button>
        <button
            @click="activeTab = 'reports'"
            :class="{ active: activeTab === 'reports' }"
            class="nav-item"
        >
          <Flag :size="18" /> Meldungen
          <span v-if="reports.length" class="counter danger">{{ reports.length }}</span>
        </button>
        <button
            @click="activeTab = 'sorgen'"
            :class="{ active: activeTab === 'sorgen' }"
            class="nav-item"
        >
          <Inbox :size="18" /> Sorgenbox
          <span v-if="entriessorgen.length" class="counter">{{ entriessorgen.length }}</span>
        </button>
        <button
            @click="activeTab = 'security'"
            :class="{ active: activeTab === 'security' }"
            class="nav-item"
        >
          <ShieldAlert :size="18" /> Sicherheit
        </button>
        <button
            @click="activeTab = 'announcements'"
            :class="{ active: activeTab === 'announcements' }"
            class="nav-item"
        >
          <Megaphone :size="18" /> Ankündigungen
        </button>
      </nav>

      <div class="sidebar-footer">
        <router-link to="/" class="back-link">
          <ArrowLeft :size="16" /> Zurück zum Dashboard
        </router-link>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="content-area">
      <!-- Header Area -->
      <div class="content-header">
        <h1>{{ tabTitles[activeTab] }}</h1>
        <div v-if="message" class="status-message" :class="{ error: isError }">
          {{ message }}
        </div>
      </div>

      <!-- Tab: Overview / Stats -->
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

        <div class="chart-section card mt-4" v-if="stats">
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

      <!-- Tab: Users -->
      <div v-if="activeTab === 'users'" class="tab-content fade-in">
        <div class="toolbar">
          <button class="btn ghost margin-bottom" @click="loadAllUsers">Aktualisieren</button>
          <div class="search-wrap">
            <!-- Suchfeld könnte hier hin -->
          </div>
        </div>

        <div class="table-container card">
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
                  <button v-if="!u.isAdmin" class="btn icon-only danger" @click="deleteUser(u.id)" title="Löschen">
                    <Trash2 :size="16"/>
                  </button>
                </div>
              </td>
            </tr>
            </tbody>
          </table>
        </div>

        <!-- Activity Log Drawer/Modal -->
        <div v-if="showActivityFor" class="activity-drawer" @click.self="showActivityFor = null">
          <div class="drawer-content card">
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
      </div>

      <!-- Tab: Reports -->
      <div v-if="activeTab === 'reports'" class="tab-content fade-in">
        <div v-if="!reports.length" class="empty-state">Keine Meldungen vorhanden.</div>
        <div class="report-grid">
          <div v-for="rep in reports" :key="rep._id" class="report-card card">
            <div class="rep-header">
              <strong>{{ rep.itemTitle }}</strong>
              <span class="small">{{ new Date(rep.reportedAt).toLocaleDateString() }}</span>
            </div>
            <div class="rep-reason">"{{ rep.reason }}"</div>
            <div class="rep-meta small">
              Item ID: {{ rep.itemId }} <br>
              Von: {{ rep.reporterEmail }}
            </div>
            <div class="rep-actions">
              <button class="btn danger tiny" @click="deleteReport(rep._id)">Erledigt / Löschen</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Sorgenbox -->
      <div v-if="activeTab === 'sorgen'" class="tab-content fade-in">
        <div v-if="!entriessorgen.length" class="empty-state">Der Kasten ist leer.</div>
        <div class="sorgen-list">
          <div v-for="s in entriessorgen" :key="s._id" class="sorge-card card">
            <div class="sorge-body">{{ s.message }}</div>
            <div class="sorge-footer">
              <span class="small">{{ new Date(s.createdAt).toLocaleString() }}</span>
              <button class="btn danger tiny" @click="deleteSorge(s._id)">Löschen</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Security -->
      <div v-if="activeTab === 'security'" class="tab-content fade-in">
        <div class="security-tools card">
          <h3>KI Sicherheits-Analyse</h3>
          <p class="small text-muted">Generiert einen Bericht basierend auf den letzten Auth-Logs via Gemini AI.</p>
          <div class="row mt-4">
            <button class="btn primary" @click="generateSecurityReport" :disabled="isGeneratingReport">
              <span v-if="isGeneratingReport">Analysiere...</span>
              <span v-else>Bericht generieren</span>
            </button>
          </div>
        </div>

        <div v-if="reportError" class="message error mt-4">{{ reportError }}</div>

        <div v-if="securityReport" class="report-result card mt-4">
          <div class="report-toolbar">
            <h4>Ergebnis</h4>
            <button class="btn ghost tiny" @click="copyReportToClipboard">Kopieren</button>
          </div>
          <div class="markdown-body" v-html="marked.parse(securityReport)"></div>
        </div>
      </div>

      <!-- Tab: Announcements -->
      <div v-if="activeTab === 'announcements'" class="tab-content fade-in">
        <div class="card">
          <h3>Neue Ankündigung</h3>
          <div class="row mt-4">
            <button class="btn" @click="showAnnouncementForm = true">Formular öffnen</button>
          </div>
          <!-- Hier könnte man eine Liste der aktiven Ankündigungen anzeigen -->
        </div>
      </div>

    </main>

    <!-- Modals -->
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
import AnnouncementForm from '../components/hw/AnnouncementForm.vue';
import { marked } from 'marked';
import {
  LayoutDashboard,
  Users,
  Flag,
  Inbox,
  ShieldAlert,
  Megaphone,
  ArrowLeft,
  FileText,
  Lock,
  Unlock,
  Trash2
} from 'lucide-vue-next';

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
  handleSuccess
} = useAdmin();

const showAnnouncementForm = ref(false);

const tabTitles: Record<string, string> = {
  overview: 'Dashboard Übersicht',
  users: 'Benutzerverwaltung',
  reports: 'Gemeldete Inhalte',
  sorgen: 'Sorgenbox',
  security: 'Sicherheits-Center',
  announcements: 'Ankündigungen'
};
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: #0f0f0f;
  color: #f1f1f1;
}

/* Sidebar */
.sidebar {
  width: 260px;
  background: #141414;
  border-right: 1px solid #282828;
  display: flex;
  flex-direction: column;
  padding: 20px;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 30px;
}

.sidebar-header h2 { margin: 0; font-size: 1.2rem; }
.admin-badge { color: white; font-size: 0.7rem; text-transform: uppercase; }

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  background: transparent;
  color: #aaaaaa;
  text-align: left;
  transition: all 0.2s;
  font-size: 0.95rem;
}

.nav-item:hover { background: rgba(255,255,255,0.05); color: white; }

.nav-item.active {
  background:rgba(255, 255, 255, 0.1);
  color: var(--text);
  font-weight: 500;
}

.counter {
  margin-left: auto;
  background: #333;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.75rem;
  color: white;
}
.counter.danger { background: var(--danger); }

.sidebar-footer { margin-top: auto; border-top: 1px solid #282828; padding-top: 20px; }
.back-link { display: flex; align-items: center; gap: 8px; color: #666; font-size: 0.9rem; transition: 0.2s; }
.back-link:hover { color: white; }

/* Content */
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

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-card {
  background: #1a1a1a;
  border: 1px solid #282828;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}
.stat-card.danger { border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); }
.stat-card.warn { border-color: rgba(245, 158, 11, 0.3); background: rgba(245, 158, 11, 0.05); }

.stat-val { font-size: 2.5rem; font-weight: 700; margin-bottom: 5px; }
.stat-label { color: #888; font-size: 0.9rem; }

/* Tables */
.table-container { overflow-x: auto; padding: 0; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #282828; }
.data-table th { background: #202020; color: #aaa; font-weight: 500; font-size: 0.85rem; }
.u-email { font-weight: 500; }
.u-id { color: #555; font-size: 0.7rem; }
.actions { display: flex; gap: 4px; justify-content: flex-end; }
.icon-only { padding: 6px; background: transparent; color: #888; }
.icon-only:hover { color: white; background: rgba(255,255,255,0.1); }
.icon-only.danger:hover { color: var(--danger); background: rgba(239, 68, 68, 0.1); }

/* Badges */
.badge { padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
.ok-badge { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.warn-badge { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.danger-badge { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

/* Activity Drawer */
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
  background: #1a1a1a;
  border-left: 1px solid #333;
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  animation: slideIn 0.3s ease;
}
@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

.log-list { list-style: none; padding: 0; }
.log-list li { border-bottom: 1px solid #282828; padding: 10px 0; }
.log-time { color: #666; font-size: 0.8rem; display: block; }
.log-type {  font-weight: 500; }
.log-meta { background: #111; padding: 5px; border-radius: 4px; font-size: 0.75rem; color: #aaa; margin-top: 4px; overflow-x: auto;}

/* Reports & Sorgen */
.report-grid, .sorgen-list { display: grid; gap: 15px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
.sorge-card, .report-card { display: flex; flex-direction: column; height: 100%; }
.sorge-body, .rep-reason { flex: 1; margin-bottom: 10px; line-height: 1.5; color: #ddd; }
.sorge-footer, .rep-meta { border-top: 1px solid #282828; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; color: #666; font-size: 0.8rem; }
.rep-header { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #282828; padding-bottom: 5px; }

/* Chart Bars */
.bar-row { display: flex; align-items: center; margin-bottom: 8px; font-size: 0.9rem; }
.bar-label { width: 100px; color: #aaa; }
.bar-track { flex: 1; height: 8px; background: #222; border-radius: 4px; margin: 0 10px; overflow: hidden; }
.bar-fill { height: 100%; background: var(--lp); border-radius: 4px; }
.bar-val { width: 30px; text-align: right; font-weight: bold; }

/* Misc */
.mt-4 { margin-top: 1rem; }
.ml-1 { margin-left: 0.25rem; }
.status-message { padding: 10px; border-radius: 6px; background: rgba(16, 185, 129, 0.2); color: #10b981; margin-bottom: 20px; }
.status-message.error { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
.loader { color: #666; padding: 20px; text-align: center; }
.margin-bottom {
  margin-bottom: 10px;
}
@media (max-width: 768px) {
  .admin-layout { flex-direction: column; }
  .sidebar { width: 100%; border-right: none; border-bottom: 1px solid #282828; padding: 15px; }
  .content-area { padding: 20px; }
  .drawer-content { width: 100%; }
}
</style>