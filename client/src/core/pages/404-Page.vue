<script setup lang="ts">
import { useRouter } from 'vue-router';
import { FileText, CalendarDays, ArrowLeft } from "lucide-vue-next";

const router = useRouter();

const goBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/items/all');
  }
};
</script>

<template>
  <div class="card not-found-container">
    <div class="not-found-content">
      <div class="error-code">404</div>
      <h1 class="error-title">Seite nicht gefunden</h1>
      <p class="error-description">
        Die aufgerufene Adresse ist ungültig oder nicht mehr verfügbar.
      </p>

      <div class="navigation-section">
        <h3 class="section-title">Wichtige Bereiche</h3>
        <div class="nav-grid">
          <router-link to="/items/all" class="nav-card">
            <div class="nav-icon">
              <FileText :size="24"/>
            </div>
            <div class="nav-info">
              <div class="nav-title">Aufgaben</div>
              <div class="nav-desc">Aufgaben und Klassenarbeiten</div>
            </div>
          </router-link>

          <router-link to="/stundenplan" class="nav-card">
            <div class="nav-icon">
              <CalendarDays :size="24"/>
            </div>
            <div class="nav-info">
              <div class="nav-title">Stundenplan</div>
              <div class="nav-desc">Persönlicher Zeitplan</div>
            </div>
          </router-link>
        </div>
      </div>

      <div class="action-section">
        <button @click="goBack" class="btn ghost">
         <ArrowLeft :size="18"/>
          Zurück zur letzten Seite
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found-container {
  max-width: 800px;
  margin: 40px auto;
}

.not-found-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 20px 0;
}

.error-code {
  font-family: var(--display-font), sans-serif;
  font-size: 96px;
  font-weight: 700;
  color: var(--text);
  line-height: 1;
  margin-bottom: 16px;
  letter-spacing: -0.02em;
}

.error-title {
  font-family: var(--display-font), sans-serif;
  font-size: 32px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 12px 0;
}

.error-description {
  font-size: 16px;
  color: var(--sub);
  margin: 0 0 48px 0;
  max-width: 500px;
}

.navigation-section {
  width: 100%;
  margin-bottom: 32px;
}

.section-title {
  font-family: var(--display-font), sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 16px 0;
  text-align: left;
}

.nav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
  width: 100%;
}

.nav-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--vlbg);
  border: 1px solid var(--border2);
  box-shadow: var(--input-shadow);
  border-radius: var(--border-radius-md);
  text-decoration: none;
  transition: all 0.15s ease;
  cursor: pointer;
}

.nav-card:hover {
  background: var(--ghost--hover);
  border-color: var(--gg);
}

.nav-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gg);
  border-radius: var(--border-radius-md);
  color: var(--text);
}

.nav-info {
  flex: 1;
  text-align: left;
}

.nav-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 2px;
}

.nav-desc {
  font-size: 13px;
  color: var(--sub);
}

.action-section {
  margin-top: 16px;
}

@media (max-width: 768px) {
  .not-found-container {
    margin: 0;
  }

  .error-code {
    font-size: 72px;
  }

  .error-title {
    font-size: 24px;
  }

  .error-description {
    font-size: 14px;
    margin-bottom: 32px;
  }

  .nav-grid {
    grid-template-columns: 1fr;
  }

  .section-title {
    font-size: 16px;
  }
}

@media (max-width: 500px) {
  .error-code {
    font-size: 64px;
  }

  .not-found-content {
    padding: 10px 0;
  }
}
</style>
