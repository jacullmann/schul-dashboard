<template>
  <div class="card not-found-container">
    <div class="not-found-content">
      <div class="error-code">404</div>
      <h1 class="error-title">Seite nicht gefunden</h1>
      <p class="error-description">
        Die angeforderte Seite existiert nicht oder wurde verschoben.
      </p>

      <div class="navigation-section">
        <h3 class="section-title">Wichtige Bereiche</h3>
        <div class="nav-grid">
          <router-link to="/items/HAUSAUFGABE" class="nav-card">
            <div class="nav-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div class="nav-info">
              <div class="nav-title">Hausaufgaben</div>
              <div class="nav-desc">Aufgaben und Termine</div>
            </div>
          </router-link>

          <router-link to="/stundenplan" class="nav-card">
            <div class="nav-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div class="nav-info">
              <div class="nav-title">Stundenplan</div>
              <div class="nav-desc">Unterrichtszeiten</div>
            </div>
          </router-link>

          <router-link to="/kuerzel" class="nav-card">
            <div class="nav-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <div class="nav-info">
              <div class="nav-title">Kürzelfinder</div>
              <div class="nav-desc">Lehrer nachschlagen</div>
            </div>
          </router-link>

          <router-link to="/daltonraumfinder" class="nav-card">
            <div class="nav-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div class="nav-info">
              <div class="nav-title">Daltonraumfinder</div>
              <div class="nav-desc">Räume finden</div>
            </div>
          </router-link>
        </div>
      </div>

      <div class="action-section">
        <button @click="goBack" class="btn ghost">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          Zurück
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const goBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/items/HAUSAUFGABE');
  }
};
</script>

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
  border-radius: var(--border-4);
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
  border-radius: var(--border-3);
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