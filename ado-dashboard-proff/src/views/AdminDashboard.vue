<template>
  <div class="admin-dashboard card">
    <div class="hw-header">
      <div>
        <h2>Admin Dashboard</h2>
        <div style="color: #f1f1f1" class="small">Statistics, user management, and security reports.</div>
      </div>
    </div>

    <div class="admin-sections">
      <div class="announcements-section">
        <h3>Wichtige Ankündigungen</h3>
        <button class="btn ghost small-btn" @click="showAnnouncementForm = true">
          Ankündigung hinzufügen
        </button>
        <div v-if="announcements.length" class="ann-list">
          <div v-for="a in announcements" :key="a._id" class="ann" :style="{ borderColor: colorFor(a.color) }">
            <div class="ann-content">{{ a.content }}</div>
            <div class="small ann-date">{{ new Date(a.createdAt).toLocaleString() }}</div>
            <div class="ann-actions">
              <button class="btn danger tiny" @click="deleteAnnouncement(a._id)">Löschen</button>
            </div>
          </div>
        </div>
        <div v-else class="empty">Keine Ankündigungen vorhanden.</div>
      </div>

      <div v-if="reports.length" class="reports-section">
        <h3>Gemeldete Einträge</h3>
        <div class="reports-list">
          <div v-for="report in reports" :key="report._id" class="report-card">
            <div class="report-header">
              <strong>{{ report.itemTitle }}</strong>
              <span class="report-date">{{ new Date(report.reportedAt).toLocaleString() }}</span>
            </div>
            <div class="report-meta">
              <span>Eintrag ID: {{ report.itemId }}</span>
              <span v-if="report.reporterEmail !== 'anonymous'">Gemeldet von: {{ report.reporterEmail }}</span>
              <span v-else>Anonym gemeldet</span>
            </div>
            <div v-if="report.reason" class="report-reason">
              <strong>Grund:</strong> {{ report.reason }}
            </div>
            <div class="report-actions">
              <button class="btn danger tiny" @click="deleteReport(report._id)">Löschen</button>
            </div>
          </div>
        </div>
      </div>

      <div class="reports-section">
        <h3>Sicherheits-Analyse</h3>
        <button class="btn" @click="generateSecurityReport" :disabled="isGeneratingReport">
          <div v-if="isGeneratingReport" class="row" style="gap: 8px; align-items: center;">
            <LoadingSpinner color="#fff" size="1.2em" />
            <span>Bericht wird generiert...</span>
          </div>
          <span v-else>Neuen Sicherheitsbericht erstellen</span>
        </button>
        <div v-if="reportError" class="message error" style="margin-top: 16px;">{{ reportError }}</div>
        <div v-if="securityReport" class="report-display-container">
          <button class="btn ghost tiny" @click="copyReportToClipboard" style="float: right; margin-bottom: 8px;">Kopieren</button>
          <div class="report-content" v-html="reportHtml"></div>
        </div>
      </div>

      <div class="reports-section">
        <h3>Sorgen</h3>
        <div class="reports-list">
          <ul class="listsorgen">
            <li v-for="(item, i) in entriessorgen" :key="item._id" class="sorge-item">
              <div class="sorge-content">
                {{ item.message }}
                <span class="sorge-date">{{ new Date(item.createdAt).toLocaleString() }}</span>
              </div>
              <button class="btn danger tiny" @click="deleteSorge(item._id)">Löschen</button>
            </li>
          </ul>
        </div>
      </div>

      <div class="users-section">
        <h3>Benutzerverwaltung</h3>
        <button class="btn" @click="loadAllUsers" :disabled="loadingUsers">
          {{ loadingUsers ? 'Lade...' : 'Benutzer neu laden' }}
        </button>
        <div v-if="allUsers.length" class="users-list">
          <div v-for="u in allUsers" :key="u.id" class="user-card">
            <div class="user-header">
              <div class="user-email">{{ u.email }}</div>
              <div class="user-badges">
                <span v-if="u.isAdmin" class="badge admin-badge">Admin</span>
                <span v-if="!u.emailVerified" class="badge warn-badge">Nicht verifiziert</span>
                <span v-if="!u.doneSetup" class="badge danger-badge">Setup nicht abgeschlossen</span>
              </div>
            </div>
            <div class="user-details">
              <div class="user-info">
                <div><strong>Kurse:</strong> Enr{{ u.enrKurs }}, WPU1:{{ u.wpuKurs1 }}, WPU2:{{ u.wpuKurs2 }}, Theater:{{ u.theater }}</div>
                <div><strong>Erstellt:</strong> {{ new Date(u.createdAt).toLocaleString() }}</div>
                <div><strong>Letzter Login:</strong> {{ u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Nie' }}</div>
              </div>
              <div class="user-actions">
                <button class="btn ghost small" @click="toggleUserActivity(u.id)">Logs laden</button>
                <button v-if="!u.isAdmin" class="btn small" :class="{ 'danger': !u.isBanned, 'ghost': u.isBanned }" @click="toggleBan(u)">
                  {{ u.isBanned ? 'Entsperren' : 'Sperren' }}
                </button>
                <button v-if="!u.isAdmin" class="btn danger small" @click="deleteUser(u.id)">Löschen</button>
              </div>
            </div>
            <div v-if="showActivityFor === u.id" class="user-activity">
              <div v-if="loadingActivities[u.id]" class="loader">Lade Aktivitäten...</div>
              <div v-else-if="userActivities[u.id]?.length" class="activity-list">
                <div v-for="(activity, index) in userActivities[u.id]" :key="index" class="activity-item">
                  <div class="activity-time">{{ new Date(activity.at).toLocaleString() }}</div>
                  <div class="activity-type">{{ activity.type }}</div>
                  <div v-if="activity.meta" class="activity-meta">{{ JSON.stringify(activity.meta) }}</div>
                </div>
              </div>
              <div v-else class="no-activity">Keine Aktivitäten gefunden</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <AnnouncementForm
        v-if="showAnnouncementForm"
        @close="showAnnouncementForm=false"
        @success="handleSuccess('Ankündigung wurde erfolgreich erstellt.')"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import LoadingSpinner from "../components/LoadingSpinner.vue";
import AnnouncementForm from '../components/hw/AnnouncementForm.vue';
import { useAdmin } from '../composables/useAdmin';

const {
  allUsers,
  loadingUsers,
  showActivityFor,
  reports,
  securityReport,
  isGeneratingReport,
  reportError,
  reportHtml,
  entriessorgen,
  announcements,
  colorFor,
  loadAllUsers,
  toggleUserActivity,
  deleteUser,
  toggleBan,
  loadReports,
  deleteReport,
  generateSecurityReport,
  copyReportToClipboard,
  loadSorgen,
  deleteSorge,
  loadAnnouncements,
  deleteAnnouncement,
  handleSuccess,
} = useAdmin();

const showAnnouncementForm = ref(false);

onMounted(() => {
  loadAllUsers();
  loadReports();
  loadSorgen();
  loadAnnouncements();
});
</script>

<style scoped>
/* Scoped styles from Hausaufgaben.vue, slightly adapted for the admin dashboard */
.admin-dashboard {
  padding: 24px;
  background-color: var(--bgl);
  border: 1px solid var(--border);
  border-radius: 12px;
}
.hw-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-direction: column;
  text-align: left;
  margin-bottom: 24px;
}
.hw-header h2 { margin: 0 0 2px 0 }

.admin-sections {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.announcements-section,
.reports-section,
.users-section {
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

h3 {
  margin-bottom: 16px;
  color: var(--text);
}

.ann-list { margin-top: 12px; }
.ann {
  border-radius: 10px;
  padding: 12px;
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}
.ann + .ann { margin-top: 10px; }
.ann-content { white-space: pre-wrap; margin-top: 6px; color: var(--text); }
.ann-date { margin-top: 6px; color: var(--muted); }
.ann-actions { margin-top: 8px; }

.reports-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.report-card {
  background: rgba(255, 0, 0, 0.05);
  border: none;
  border-radius: 8px;
  padding: 12px;
}
.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}
.report-header strong {
  color: var(--text);
  flex: 1;
  margin-right: 12px;
}
.report-date {
  color: var(--muted);
  font-size: 0.85em;
  white-space: nowrap;
}
.report-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 0.9em;
  color: var(--muted);
  flex-wrap: wrap;
}
.report-reason {
  background: rgba(255, 255, 255, 0.05);
  padding: 8px;
  border-radius: 4px;
  font-size: 0.9em;
  color: var(--text);
}
.report-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.report-display-container {
  margin-top: 16px;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  clear: both;
}

.report-content :deep(h1),
.report-content :deep(h2),
.report-content :deep(h3) {
  margin-top: 1.2em;
  margin-bottom: 0.6em;
  font-weight: 700;
  border-bottom: 1px solid var(--border);
  padding-bottom: 4px;
}
.report-content :deep(h1) { font-size: 1.6rem; }
.report-content :deep(h2) { font-size: 1.4rem; }
.report-content :deep(h3) { font-size: 1.2rem; }

.listsorgen {
  display: flex;
  gap: 12px;
  flex-direction: column;
  overflow: hidden;
  margin: 0;
  padding: 0;
  list-style: none;
}
.sorge-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 8px;
}
.sorge-content { flex: 1; }
.sorge-date {
  display: block;
  font-size: 0.8em;
  color: var(--muted);
  margin-top: 4px;
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}
.user-card {
  background: #353535;
  border-radius: 8px;
  padding: 16px;
  border: none;
}
.user-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}
.user-email {
  font-weight: 600;
  font-size: 1.1em;
  color: white;
}
.user-badges { display: flex; gap: 6px; flex-wrap: wrap; }
.user-badges .badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: 600;
}
.admin-badge { background: rgba(255, 255, 255, 0.05); color: white; }
.warn-badge { background: var(--warn); color: black; }
.danger-badge { background: var(--danger); color: white; }

.user-details {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}
.user-info { flex: 1; font-size: 0.9em; color: white; }
.user-info div { margin-bottom: 4px; }
.user-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.user-activity {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
</style>