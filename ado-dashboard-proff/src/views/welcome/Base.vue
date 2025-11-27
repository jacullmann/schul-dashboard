<template>
  <div class="showcase-wrapper">
    <div class="feature-list">

      <div
          :class="['feature-tab', { 'is-active': activeFeature === features[0].id }]"
          @mouseenter="activeFeature = features[0].id"
      >
        <div class="icon-circle">
         <LayoutDashboard size="20px" />
        </div>
        <div>
          <h3 class="feature-title">Zentrale Organisation</h3>
        </div>
      </div>

      <div
          :class="['feature-tab', { 'is-active': activeFeature === features[1].id }]"
          @mouseenter="activeFeature = features[1].id"
      >
        <div class="icon-circle">
          <Zap  size="20px" />
        </div>
        <div>
          <h3 class="feature-title">Echtzeit-Synchronisation</h3>
        </div>
      </div>

      <div
          :class="['feature-tab', { 'is-active': activeFeature === features[2].id }]"
          @mouseenter="activeFeature = features[2].id"
      >
        <div class="icon-circle">
          <Users size="20px" />
        </div>
        <div>
          <h3 class="feature-title">Intelligente Kollaboration</h3>
        </div>
      </div>

      <div
          :class="['feature-tab', { 'is-active': activeFeature === features[3].id }]"
          @mouseenter="activeFeature = features[3].id"
      >
        <div class="icon-circle">
          <ShieldCheck size="20px"/>
        </div>
        <div>
          <h3 class="feature-title">Datenschutz-Garantie</h3>
        </div>
      </div>
    </div>

    <div class="showcase-display">
        <div :key="activeFeature" class="showcase-content">

          <div :class="['display-mockup', 'mockup-' + activeFeature]">
            <div v-if="activeFeature === 'organization'" class="mockup-content">
              <img class="mb" src="https://images.klipfolio.com/website/public/bf9c6fbb-06bf-4f1d-88a7-d02b70902bd1/data-dashboard.png" alt="Bild"/>
            </div>

            <div v-else-if="activeFeature === 'sync'" class="mockup-content">
              <img class="mb" src="https://learn.microsoft.com/de-de/power-bi/create-reports/media/service-dashboards/power-bi-dashboard2.png" alt="Bild"/>
            </div>

            <div v-else-if="activeFeature === 'collaboration'" class="mockup-content">
              <img class="mb" src="https://static.coupler.io/templates/shopify-marketing-funnel-dashboard-power-bi.png" alt="Bild"/>
            </div>

            <div v-else-if="activeFeature === 'security'" class="mockup-content">
              <img class="mb" src="https://assets.justinmind.com/wp-content/uploads/2020/02/dashboard-design-example-hcare.png" alt="Bild"/>
            </div>

          </div>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { LayoutDashboard, Zap, Users, ShieldCheck } from 'lucide-vue-next';

const features = [
  { id: 'organization' },
  { id: 'sync'},
  { id: 'collaboration'},
  { id: 'security' },
];

const activeFeature = ref(features[0].id);

</script>

<style scoped>
.showcase-wrapper {
  display: flex;
  justify-content: center;
  gap: 80px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 500px;
  padding-bottom: 50px;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 40%;
  max-width: 450px;
}

.feature-tab {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.feature-tab.is-active {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.icon-circle {
  width: 45px;
  height: 45px;
  min-width: 45px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.3s ease;
}
.feature-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: white;
}

.showcase-display {
  width: 60%;
  height: 500px;
  border-radius: 16px;
  padding: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.showcase-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
}

.display-mockup {
  width: 90%;
  height: 80%;
  background: #18181b;
  display: flex;
  justify-content: center;
  align-items: center;
}
.mockup-content {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  object-fit: cover;
}
@media (max-width: 1024px) {
  .showcase-wrapper {
    flex-direction: column;
    gap: 40px;
    min-height: auto;
  }
  .feature-list {
    width: 100%;
    max-width: none;
  }
  .showcase-display {
    width: 100%;
    height: 350px;
  }
}
</style>