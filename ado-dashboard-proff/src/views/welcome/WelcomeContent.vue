<script setup lang="ts">
import Line from './Line.vue'
import { Ellipsis } from 'lucide-vue-next'
import WelcomeButtonPrimary from "./WelcomeButtonPrimary.vue";
import WelcomeButtonSecondary from "./WelcomeButtonSecondary.vue";

defineProps<{
  onStartClick: () => void;
  onMoreInfoClick: () => void;
}>();
</script>

<template>
  <div class="welcome-section">
    <div class="visual-container">
      <div class="example-wrapper">
        <div class="example-dashboard">
          <div class="example-card">
            <div class="example-main">
              <div class="example-meta">
                <div class="example-top-row">
                  <div class="example-checkbox-ticked">
                    <span class="example-tick"></span>
                  </div>
                  <h3 class="example-title">Kapitel 3 lesen</h3>
                </div>
              </div>
              <div class="example-menu-trigger">
                <Ellipsis :size="24" :stroke-width="2" stroke="currentColor"></Ellipsis>
              </div>
            </div>
          </div>
          <div class="example-card only-desktop">
            <div class="example-main">
              <div class="example-meta">
                <div class="example-top-row">
                  <div class="example-checkbox"></div>
                  <h3 class="example-title">Notizen für den Test</h3>
                </div>
                <div class="example-badge-row">
                  <div class="example-badge">Erdkunde</div>
                  <div class="example-badge">8.2.2026</div>
                </div>
              </div>
              <div class="example-menu-trigger">
                <Ellipsis :size="24" :stroke-width="2" stroke="currentColor"></Ellipsis>
              </div>
            </div>
            <div class="example-body">
              <span>[Bild]</span>
            </div>
          </div>
          <div class="example-card">
            <div class="example-main">
              <div class="example-meta">
                <div class="example-top-row">
                  <div class="example-checkbox"></div>
                  <h3 class="example-title">Aufgaben im Buch</h3>
                </div>
                <div class="example-badge-row">
                  <div class="example-badge">Mathe</div>
                  <div class="example-badge">9.2.2026</div>
                </div>
              </div>
              <div class="example-menu-trigger">
                <Ellipsis :size="24" :stroke-width="2" stroke="currentColor"></Ellipsis>
              </div>
            </div>
            <div class="example-body">
              <span>S. 137 4b und 5 schriftlich bearbeiten</span>
            </div>
          </div>
          <div class="example-card-vanishing"></div>
        </div>
      </div>
    </div>

    <div class="text-content">
      <h1 class="headline">Schule im Überblick</h1>
      <p class="subline">
        Alle Infos zu jeder Zeit in deiner Hosentasche.
        Kollaborativ und
        <span class="free"><span class="line-span">komplett kostenfrei <Line class="line"/></span> </span>.
      </p>

      <div class="action-buttons">
        <WelcomeButtonSecondary class="action-btn secondary" @click="onMoreInfoClick" />
        <WelcomeButtonPrimary @click="onStartClick" class="action-btn primary"/>
      </div>
    </div>

  </div>
</template>

<style scoped>

.line {
  height: 12px;
  width: 100%;
  position: absolute;
  bottom: -5px;
  left: 0;
}
.line-span {
  display: inline-block;
  position: relative;
}
.welcome-section {
  display: flex;
  flex-direction: row;
  align-items: center;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  min-height: calc(100vh - 70px - 50px - 2rem);
  gap: 0;
  padding: 40px 0;
}

.visual-container {
  flex: 1;
  display: flex;
  justify-content: center;
  width:100%;
}

.example-wrapper {
  flex-direction: column;
  width: 100%;
  max-width: 640px;
}

.example-dashboard {
  margin-top: 12px;
  gap: 12px;
  display:flex;
  flex-direction: column;
  justify-content: left;
}

.example-card {
  background: var(--vlbg);
  border:1px solid var(--border2);
  border-radius: 16px;
  padding:12px;
  color: var(--text);
  width: 100%;
}

.example-main {
  position:relative;
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:12px
}

.example-meta {
  flex:1;
  min-width:0
}

.example-top-row {
  display: flex;
  align-items: center;
  flex-direction: row;
  gap: 8px;
}

.example-checkbox {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 2px solid var(--sub);
  background: transparent;
  position: relative;
}

.example-checkbox:hover {
  border-color: var(--text);
}

.example-checkbox-ticked {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 2px solid var(--text);
  background: var(--text);
  position: relative;
}

.example-tick {
  content:"";
  position:absolute;
  width:5px;
  height:10px;
  border:solid var(--bg);
  border-width:0 2px 2px 0;
  opacity:1;
  left:50%;
  top:32%;
  transform:translate(-50%,-45%) rotate(45deg);
}

.example-title {
  margin: -2px 0;
  font-size: 1.125rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 22px;
  color: var(--text);
  font-family: var(--display-font), sans-serif;
}

.example-badge-row {
  display: flex;
  margin-top: 8px;
  gap: 8px;
  align-items: center;
}

.example-badge {
  background: var(--gg);
  color: var(--text);
  border: none;
  padding: 4px 8px;
  border-radius: 8px;
  font-family: var(--normal-font), sans-serif;
  font-size: 16px;
}

.example-menu-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 24px;
  cursor: pointer;
  color: var(--sub);
  transition: 0.1s;
  margin: -3px 0;
}

.example-menu-trigger:hover {
  color:var(--text);
}

.example-body {
  margin-top: 8px;
  color: var(--text);
  word-break: break-word;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  font-family: var(--normal-font), sans-serif;
  font-size: 16px;
}

.example-card-vanishing {
  background:linear-gradient(var(--vlbg) 0%, transparent 100%);
  border-radius: 16px 16px 0 0;
  min-height: 30px;
}

.example-card-vanishing::before {
  content: "";
  border-radius: 16px 16px 0 0;
  min-height: 30px;
  display: flex;
  border: 1px solid transparent;
  background: linear-gradient(var(--gg) 0%, transparent 100%) border-box;
  -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.text-content {
  flex: 1;
  color: var(--text);
}

.headline {
  font-size: 7rem;
  font-weight: 600;
  line-height: 1.1;
  margin-bottom: 16px;
  letter-spacing: -0.01em;
  text-align: right;
}

.subline {
  font-size: 1.25rem;
  line-height: 1.6;
  margin-bottom: 32px;
  margin-top: 0;
  color: var(--sub);
  text-align: right;
}


.free {
  font-weight: 600;
  color: var(--text);
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 30px;
  justify-content: flex-end;
}

.action-btn {
  padding: 10px 24px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  min-width: 180px;
  position: relative;
  overflow: hidden;
}


.secondary {
  white-space: nowrap;
}
.primary  {
  white-space: nowrap;
}
@media (max-width: 1200px) {
  .welcome-section {
    flex-direction: column;
    padding: 0;
  }

  .text-content {
    max-width: 100%;
    order: 2;
  }

  .visual-container {
    order: 1;
  }

  .headline {
    font-size: 100px;
    text-align: Left;
  }

  .subline {
    font-size: 1.4rem;
    text-align: left;
  }

  .action-buttons {
    justify-content: center;
  }
}

@media (max-width: 576px) {
  .only-desktop {
    display: none;
  }

  .headline {
    margin-top: -24px;
    font-size: 75px;
  }

  .action-buttons {
    flex-direction: row;
    gap: 8px;
  }

  .action-btn {
    padding: 0;
    min-width: inherit;
  }

  .secondary, .primary {
    padding: 12px 14px 12px 14px;
    font-size: 1rem;
  }
}

@media (max-width: 368px) {
  .headline {
    font-size: 65px;
  }
}

@media (max-width: 324px) {
  .headline {
    font-size: 60px
  }
}

@media (max-width: 300px) {
  .headline {
    font-size: 50px
  }
}

</style>