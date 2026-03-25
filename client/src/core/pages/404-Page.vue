<script setup lang="ts">
import { useRouter } from 'vue-router';
import { LayoutDashboard, ListTodo, CalendarDays, Lock, ArrowLeft } from '@lucide/vue';

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
      <h1 class="error-title">Page not found</h1>
      <p class="error-description">
        The page you're looking for doesn't exist or isn't available.
      </p>

      <div class="navigation-section">
        <div class="nav-grid">
          <router-link to="/home" class="nav-card">
            <div class="nav-icon">
              <LayoutDashboard :size="24" />
            </div>
            <div class="nav-info">
              <div class="nav-title">Homepage</div>
              <div class="nav-desc">Overview of your groups</div>
            </div>
          </router-link>

          <router-link to="/tasks" class="nav-card">
            <div class="nav-icon">
              <ListTodo :size="24" />
            </div>
            <div class="nav-info">
              <div class="nav-title">Tasks</div>
              <div class="nav-desc">Homework, assignments and exams</div>
            </div>
          </router-link>

          <router-link to="/schedule" class="nav-card">
            <div class="nav-icon">
              <CalendarDays :size="24" />
            </div>
            <div class="nav-info">
              <div class="nav-title">Schedule</div>
              <div class="nav-desc">All of your lessons</div>
            </div>
          </router-link>

          <router-link to="/todos" class="nav-card">
            <div class="nav-icon">
              <Lock :size="24" />
            </div>
            <div class="nav-info">
              <div class="nav-title">Private Tasks</div>
              <div class="nav-desc">Your private list of tasks</div>
            </div>
          </router-link>
        </div>
      </div>

      <div class="action-section">
        <BaseButton @click="goBack" variant="ghost">
          <ArrowLeft :size="18" />
          Go back
        </BaseButton>
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
  font-family: var(--font-display), sans-serif;
  font-size: 96px;
  font-weight: 700;
  color: var(--color-on-surface);
  line-height: 1;
  margin-bottom: 16px;
  letter-spacing: -0.02em;
}

.error-title {
  font-family: var(--font-display), sans-serif;
  font-size: 32px;
  font-weight: 600;
  color: var(--color-on-surface);
  margin: 0 0 12px 0;
}

.error-description {
  font-size: var(--text-body);
  color: var(--color-on-surface-muted);
  margin: 0 0 48px 0;
  max-width: 500px;
}

.navigation-section {
  width: 100%;
  margin-bottom: 32px;
}

.section-title {
  font-family: var(--font-display), sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-on-surface);
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
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  box-shadow: var(--shadow-input);
  border-radius: var(--radius-xl);
  text-decoration: none;
  transition: all 0.15s ease;
  cursor: pointer;
}

.nav-card:hover {
  background-color: var(--color-surface-hover-subtle);
}

.nav-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-hover);
  border-radius: var(--radius-md);
  color: var(--color-on-surface);
}

.nav-info {
  flex: 1;
  text-align: left;
}

.nav-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-on-surface);
  margin-bottom: 2px;
}

.nav-desc {
  font-size: 13px;
  color: var(--color-on-surface-muted);
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
