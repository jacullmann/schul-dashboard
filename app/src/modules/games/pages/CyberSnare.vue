<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { useCyberSnare } from '@/modules/games/composables/useCyberSnare';

const { t } = useI18n();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const monitorRef = ref<HTMLElement | null>(null);

const {
  gameState,
  score,
  lives,
  energy,
  energyMax,
  driveSpace,
  energyBarColor,
  meta,
  init,
  destroy,
  startGame,
  restartGame,
  openUpgrades,
  closeUpgrades,
  getUpgradeCost,
  isUpgradeMaxed,
  buyUpgrade,
} = useCyberSnare();

onMounted(() => init(canvasRef, monitorRef));
onBeforeUnmount(() => destroy());
</script>

<template>
  <div id="monitor" ref="monitorRef">
    <canvas id="gameCanvas" ref="canvasRef"></canvas>
    <div class="crt-overlay"></div>
    <div class="crt-flicker"></div>

    <div v-if="gameState === 'PLAYING'" id="ui-layer">
      <div id="top-hud">
        <div class="hud-text">
          {{ t('games.cyber_snare.hud.score') }} <span>{{ score }}</span>
        </div>
        <div
          class="hud-text"
          style="
            color: var(--neon-yellow);
            text-shadow: 0 0 5px var(--neon-yellow);
          "
        >
          {{ t('games.cyber_snare.hud.free_space') }}
          <span>{{ driveSpace }}</span>
          {{ t('games.cyber_snare.kb') }}
        </div>
        <div class="hud-text">
          {{ t('games.cyber_snare.hud.integrity') }} <span>{{ lives }}</span>
        </div>
      </div>
      <div id="energy-container">
        <div
          id="energy-bar"
          :style="{
            width: (energy / energyMax) * 100 + '%',
            backgroundColor: energyBarColor,
            boxShadow: '0 0 10px ' + energyBarColor,
          }"
        ></div>
      </div>
    </div>

    <!-- Start Screen -->
    <div v-if="gameState === 'START'" class="screen">
      <h1>CYBER_SNARE</h1>
      <p>
        {{ t('games.cyber_snare.start.intro') }}<br /><br />
        <strong>{{ t('games.cyber_snare.start.hold') }}</strong>
        {{ t('games.cyber_snare.start.hold_text') }}<br />
        <strong>{{ t('games.cyber_snare.start.cross') }}</strong>
        {{ t('games.cyber_snare.start.cross_text') }}<br />
        {{ t('games.cyber_snare.start.trap') }}<br /><br />
        <em>{{ t('games.cyber_snare.start.warning') }}</em>
        {{ t('games.cyber_snare.start.warning_text') }}
      </p>
      <button class="cs-btn" @click="startGame">
        {{ t('games.cyber_snare.start.initialize') }}
      </button>
    </div>

    <!-- Game Over Screen -->
    <div v-if="gameState === 'GAMEOVER'" class="screen">
      <h1>{{ t('games.cyber_snare.game_over.title') }}</h1>
      <h2>{{ t('games.cyber_snare.game_over.final_score', { score }) }}</h2>
      <p>{{ t('games.cyber_snare.game_over.text') }}</p>
      <div style="display: flex; gap: 20px">
        <button
          class="cs-btn"
          style="
            border-color: var(--neon-yellow);
            color: var(--neon-yellow);
            box-shadow: 0 0 15px var(--neon-yellow);
          "
          @click="openUpgrades"
        >
          {{ t('games.cyber_snare.game_over.upgrades') }}
        </button>
        <button class="cs-btn" @click="restartGame">
          {{ t('games.cyber_snare.game_over.reboot') }}
        </button>
      </div>
    </div>

    <!-- Upgrade Screen -->
    <div v-if="gameState === 'UPGRADE'" class="screen" style="padding: 40px">
      <h1 style="font-size: 3rem">
        {{ t('games.cyber_snare.upgrades.title') }}
      </h1>
      <div class="stat-header">
        {{ t('games.cyber_snare.upgrades.available', { space: driveSpace }) }}
      </div>
      <div class="upgrade-container">
        <div v-for="(u, key) in meta.upgrades" :key="key" class="upgrade-card">
          <div>
            <h3>
              {{ t(u.name) }}
              {{
                key === 'heal'
                  ? ''
                  : t('games.cyber_snare.upgrades.level', {
                      lvl: u.lvl,
                      max: u.max,
                    })
              }}
            </h3>
            <p>{{ t(u.desc) }}</p>
          </div>
          <div class="card-footer">
            <span class="cost">{{
              isUpgradeMaxed(key as string)
                ? '---'
                : getUpgradeCost(key as string) +
                  ' ' +
                  t('games.cyber_snare.kb')
            }}</span>
            <button
              class="dl-btn"
              :disabled="
                isUpgradeMaxed(key as string) ||
                driveSpace < getUpgradeCost(key as string)
              "
              @click="buyUpgrade(key as string)"
            >
              {{
                isUpgradeMaxed(key as string)
                  ? key === 'heal'
                    ? t('games.cyber_snare.upgrades.full')
                    : t('games.cyber_snare.upgrades.maxed')
                  : t('games.cyber_snare.upgrades.download')
              }}
            </button>
          </div>
        </div>
      </div>
      <button class="cs-btn" style="margin-top: 20px" @click="closeUpgrades">
        {{ t('games.cyber_snare.upgrades.close') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

/* CSS Variables */
:deep(:root) {
  --neon-cyan: #0ff;
  --neon-magenta: #f0f;
  --neon-yellow: #ff0;
  --bg-color: #050510;
  --neon-green: #0f0;
  --neon-red: #f00;
  --neon-orange: #ff4500;
}

#monitor {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #050510;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  font-family: 'Share Tech Mono', monospace;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  z-index: 99999;
}

#gameCanvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
}

/* CRT Effects */
.crt-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background:
    linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%),
    linear-gradient(
      90deg,
      rgba(255, 0, 0, 0.06),
      rgba(0, 255, 0, 0.02),
      rgba(0, 0, 255, 0.06)
    );
  background-size:
    100% 4px,
    6px 100%;
  pointer-events: none;
  z-index: 20;
  box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.9);
}

.crt-flicker {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.02);
  opacity: 0;
  pointer-events: none;
  z-index: 21;
  animation: flicker 0.15s infinite;
}

@keyframes flicker {
  0% {
    opacity: 0.01;
  }
  50% {
    opacity: 0.04;
  }
  100% {
    opacity: 0.01;
  }
}

/* HUD */
#ui-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 30;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px;
  box-sizing: border-box;
}

.hud-text {
  color: #0ff;
  text-shadow:
    0 0 5px #0ff,
    0 0 10px #0ff;
  font-size: 1.5rem;
  text-transform: uppercase;
  letter-spacing: 2px;
}

#top-hud {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

#energy-container {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  width: 300px;
  height: 15px;
  border: 2px solid #0ff;
  border-radius: 8px;
  box-shadow: 0 0 10px #0ff;
  padding: 2px;
  box-sizing: border-box;
}

#energy-bar {
  height: 100%;
  width: 100%;
  border-radius: 4px;
  transition: width 0.1s linear;
}

/* Screens */
.screen {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 40;
  background: rgba(0, 0, 0, 0.8);
  pointer-events: auto;
  text-align: center;
}

h1 {
  color: #f0f;
  text-shadow:
    0 0 10px #f0f,
    0 0 20px #f0f,
    3px 3px 0px rgba(0, 255, 255, 0.5);
  font-size: 4rem;
  margin-bottom: 10px;
  letter-spacing: 5px;
  font-family: 'Share Tech Mono', monospace;
}

h2 {
  color: #0ff;
  font-size: 2rem;
  text-shadow: 0 0 10px #0ff;
  font-family: 'Share Tech Mono', monospace;
}

p {
  color: #fff;
  max-width: 600px;
  line-height: 1.6;
  font-size: 1.2rem;
  text-shadow: 0 0 4px #fff;
  margin-bottom: 30px;
  font-family: 'Share Tech Mono', monospace;
}

.cs-btn {
  padding: 15px 40px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 1.5rem;
  color: #050510;
  background-color: #0ff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  text-transform: uppercase;
  font-weight: bold;
  box-shadow:
    0 0 15px #0ff,
    inset 0 0 10px #fff;
  transition: all 0.2s;
}

.cs-btn:hover {
  background-color: #fff;
  box-shadow:
    0 0 25px #0ff,
    inset 0 0 15px #0ff;
  transform: scale(1.05);
}

/* Screen Shake */
:deep(.shake) {
  animation: shake 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

@keyframes shake {
  10%,
  90% {
    transform: translate3d(-2px, 2px, 0);
  }
  20%,
  80% {
    transform: translate3d(4px, -2px, 0);
  }
  30%,
  50%,
  70% {
    transform: translate3d(-6px, 4px, 0);
  }
  40%,
  60% {
    transform: translate3d(6px, -4px, 0);
  }
}

/* Upgrade Screen */
.upgrade-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  max-width: 900px;
  width: 100%;
  max-height: 60vh;
  overflow-y: auto;
  margin-bottom: 20px;
  padding-right: 10px;
}

.upgrade-container::-webkit-scrollbar {
  width: 8px;
}
.upgrade-container::-webkit-scrollbar-track {
  background: #111;
  border: 1px solid #0ff;
}
.upgrade-container::-webkit-scrollbar-thumb {
  background: #0ff;
}

.upgrade-card {
  border: 1px solid #0ff;
  background: rgba(0, 255, 255, 0.05);
  padding: 15px;
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.upgrade-card h3 {
  margin: 0 0 5px 0;
  color: #f0f;
  font-size: 1.2rem;
  text-shadow: 0 0 5px #f0f;
  font-family: 'Share Tech Mono', monospace;
}

.upgrade-card p {
  font-size: 0.9rem;
  margin: 0 0 15px 0;
  color: #ddd;
  text-shadow: none;
  line-height: 1.4;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cost {
  color: #ff0;
  font-weight: bold;
  font-size: 1.2rem;
  text-shadow: 0 0 5px #ff0;
}

.dl-btn {
  background: #050510;
  border: 1px solid #0ff;
  color: #0ff;
  padding: 8px 15px;
  cursor: pointer;
  font-family: 'Share Tech Mono', monospace;
  font-weight: bold;
  transition: all 0.2s;
}

.dl-btn:hover:not(:disabled) {
  background: #0ff;
  color: #000;
  box-shadow: 0 0 10px #0ff;
}

.dl-btn:disabled {
  border-color: #555;
  color: #555;
  cursor: not-allowed;
  background: transparent;
}

.stat-header {
  color: #0f0;
  font-size: 1.5rem;
  margin-bottom: 20px;
  text-shadow: 0 0 10px #0f0;
  font-family: 'Share Tech Mono', monospace;
}
</style>
