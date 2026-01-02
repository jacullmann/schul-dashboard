<script setup lang="ts">
//import Special from "./Special.vue";
import G from "./G.vue";
import Line from './Line.vue'
import { ArrowDown, Ellipsis } from 'lucide-vue-next'
import NewMainButton from "./NewMainButton.vue";

defineProps<{
  onStartClick: () => void;
  onMoreInfoClick: () => void;
}>();
</script>

<template>
  <div class="welcome-section">
    <div class="visual-container">
      <div class="example-wrapper">
        <div class="example-announcement">
          <span>Chemie fällt morgen aus</span>
        </div>
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
          <div class="example-card">
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
        <button class="action-btn secondary arrow-hover-effect border" @click="onMoreInfoClick">
          <span class="arrow-wrapper">
            Mehr erfahren
            <ArrowDown class="arrow-icon original-arrow" :size="20"/>
            <ArrowDown class="arrow-icon replacement-arrow" :size="20"/>
          </span>
        </button>

        <NewMainButton @click="onStartClick" class="border overflow-gg" />
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
}

.example-announcement {
  background: #282828;
  border-block: 1px solid #414141;
  padding: 10px 12px;
  border-radius: 0;
  font-family: var(--normal-font);
  font-size: 16px;
}

.example-dashboard {
  margin-top: 12px;
  gap: 12px;
  display:flex;
  flex-direction: column;
  justify-content: left;
  width: 100%;
  max-width: 640px;
}

.example-card {
  background: #282828;
  border:1px solid #414141;
  border-radius: 16px;
  padding:12px;
  color: #fff;
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
  border: 2px solid #aaa;
  background: transparent;
  position: relative;
}

.example-checkbox:hover {
  border-color: #fff;
}

.example-checkbox-ticked {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 2px solid #fff;
  background: #fff;
  position: relative;
}

.example-tick {
  content:"";
  position:absolute;
  width:5px;
  height:10px;
  border:solid #0f0f0f;
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
  color: #fff;
  font-family: var(--display-font);
}

.example-badge-row {
  margin-top: 8px;
  gap: 8px;
  align-items: center;
}

.example-badge {
  background: #414141;
  color: #fff;
  border: none;
  padding: 4px 8px;
  border-radius: 8px;
  font-family: var(--normal-font);
  font-size: 16px;
}

.example-menu-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 24px;
  cursor: pointer;
  color: #aaa;
  transition: 0.1s;
  margin: -3px 0;
}

.example-menu-trigger:hover {
  color: #fff;
}

.example-body {
  margin-top: 8px;
  color: #fff;
  word-break: break-word;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  font-family: var(--normal-font);
  font-size: 16px;
}

.example-card-vanishing {
  background:linear-gradient(#282828, transparent) padding-box, linear-gradient(#414141, transparent) border-box;
  border:1px solid transparent;
  border-radius: 16px 16px 0 0;
  min-height: 50px;
}

.text-content {
  flex: 1;
  color: #fff;
}

.headline {
  font-size: 7rem;
  font-weight: 600;
  line-height: 1.1;
  margin-bottom: 24px;
  letter-spacing: -0.05em;
  text-align: right;
}

.subline {
  font-size: 1.25rem;
  line-height: 1.6;
  margin-bottom: 32px;
  color: #c0c0c0;
  text-align: right;

}


.free {
  font-weight: 600;
  color: #fff;
}

.action-buttons {
  display: flex;
  gap: 20px;
  margin-top: 30px;
  justify-content: flex-end;
}

.action-btn {
  padding: 14px 30px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 180px;
  position: relative;
  overflow: hidden;
}


.secondary {
  border: 2px solid transparent;
  background: transparent;
  color: var(--start--text);
}

.secondary:hover {
}
.arrow-hover-effect {
  display: flex;
  align-items: center;
  justify-content: center;
}

.arrow-wrapper {
  display: inline-flex;
  align-items: center;
  position: relative;
  padding-right: 24px;
}

.arrow-icon {
  width: 20px;
  height: 20px;
  position: absolute;
  right: 0;
  color: #fff;
  top: 0;
  transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s;
}
.replacement-arrow {
  transform: translateY(calc(-50% - 100% - 10px));
  opacity: 0;
}

.arrow-hover-effect:hover .original-arrow {
  transform: translateY(calc(-50% + 100% + 10px));
  opacity: 0;
}

.arrow-hover-effect:hover .replacement-arrow {
  transform: translateY(0);
  opacity: 1;
}

/* Vertikales Layout */
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

/* Mobile Layout */
@media (max-width: 576px) {
  .headline {
    margin-top: 16px;
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

  .arrow-wrapper {
    padding-right: 20px;
  }

  .arrow-icon {
    width: 16px;
    height: 16px;
  }

  .overflow-gg {
    overflow: hidden;
  }
}

/* kleinerer Text für sehr schmale Displays */
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

.border {
  /*border: 1px solid red;*/
}
</style>