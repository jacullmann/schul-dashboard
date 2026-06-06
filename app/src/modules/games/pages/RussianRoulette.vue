<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import {
  Skull,
  RefreshCw,
  Crosshair,
  Settings,
  ShieldCheck,
  Flame,
  Plus,
  Minus,
} from '@lucide/vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const chamberSize = ref(6);
const bulletCount = ref(1);
const spinAfterShot = ref(true);
const showSettings = ref(false);

const status = ref<'playing' | 'dead' | 'won'>('playing');
const shotsFired = ref(0);
const isProcessing = ref(false);

const cylinder = ref<boolean[]>([]);
const currentChamberIndex = ref(0);
const shotChambers = ref<Set<number>>(new Set());
const visualSpinSpins = ref(0);

function initGame() {
  status.value = 'playing';
  shotsFired.value = 0;
  shotChambers.value.clear();

  const newCylinder = Array(chamberSize.value).fill(false);
  let bulletsPlaced = 0;
  while (bulletsPlaced < bulletCount.value) {
    const randomIndex = Math.floor(Math.random() * chamberSize.value);
    if (!newCylinder[randomIndex]) {
      newCylinder[randomIndex] = true;
      bulletsPlaced++;
    }
  }
  cylinder.value = newCylinder;

  currentChamberIndex.value = Math.floor(Math.random() * chamberSize.value);
}

watch(chamberSize, (v) => {
  if (v < 2) chamberSize.value = 2;
  if (v > 12) chamberSize.value = 12;
  if (bulletCount.value >= chamberSize.value)
    bulletCount.value = Math.max(1, chamberSize.value - 1);
  initGame();
});

watch(bulletCount, (v) => {
  if (v < 1) bulletCount.value = 1;
  if (v >= chamberSize.value)
    bulletCount.value = Math.max(1, chamberSize.value - 1);
  initGame();
});

watch(spinAfterShot, () => initGame());

const probabilityPercentage = computed(() => {
  if (status.value === 'dead') return 100;
  if (status.value === 'won') return 0;
  if (spinAfterShot.value) {
    return (bulletCount.value / chamberSize.value) * 100;
  } else {
    return (bulletCount.value / (chamberSize.value - shotsFired.value)) * 100;
  }
});

const oddsDisplay = computed(() => {
  if (status.value === 'dead') return 'Gestorben';
  if (status.value === 'won') return t('games.roulette.status.won');
  return spinAfterShot.value
    ? `${bulletCount.value} / ${chamberSize.value}`
    : `${bulletCount.value} / ${chamberSize.value - shotsFired.value}`;
});

const gameStatusText = computed(() => {
  if (status.value === 'dead') return '*PANG* ...';
  if (status.value === 'won') return 'Trommel geleert. Du lebst.';
  if (shotsFired.value > 0) return t('games.roulette.status.click');
  return `Waffe geladen.`;
});

const cylinderStyle = computed(() => {
  const anglePerChamber = 360 / chamberSize.value;
  const baseAngle = -(currentChamberIndex.value * anglePerChamber);
  const totalAngle = baseAngle - visualSpinSpins.value * 360;

  return {
    transform: `rotate(${totalAngle}deg)`,
  };
});

const getChamberStyle = (index: number) => {
  const angle = (360 / chamberSize.value) * index;
  const radius = Math.max(40, 100 - chamberSize.value * 3);
  return {
    transform: `rotate(${angle}deg) translateY(-${radius}px)`,
    width: `${Math.max(15, 40 - chamberSize.value)}px`,
    height: `${Math.max(15, 40 - chamberSize.value)}px`,
  };
};

function adjustSetting(type: 'chamber' | 'bullet', delta: number) {
  if (type === 'chamber') chamberSize.value += delta;
  if (type === 'bullet') bulletCount.value += delta;
}

function pullTrigger() {
  if (status.value !== 'playing' || isProcessing.value) return;
  isProcessing.value = true;

  let delay = 400;

  if (spinAfterShot.value) {
    visualSpinSpins.value += 2 + Math.floor(Math.random() * 3);
    currentChamberIndex.value = Math.floor(Math.random() * chamberSize.value);
    delay = 1200;
  }

  setTimeout(() => {
    isProcessing.value = false;

    const isBullet = cylinder.value[currentChamberIndex.value];
    shotChambers.value.add(currentChamberIndex.value);

    if (isBullet) {
      status.value = 'dead';
    } else {
      shotsFired.value++;
      if (!spinAfterShot.value) {
        if (shotsFired.value === chamberSize.value - bulletCount.value) {
          status.value = 'won';
        } else {
          currentChamberIndex.value =
            (currentChamberIndex.value + 1) % chamberSize.value;
        }
      }
    }
  }, delay);
}

onMounted(() => {
  initGame();
});
</script>

<template>
  <div class="rr-container">
    <div
      class="rr-game-card"
      :class="
        status === 'dead'
          ? 'rr-dead-state'
          : status === 'won'
            ? 'rr-won-state'
            : ''
      "
    >
      <header class="rr-header">
        <h1 class="rr-title">RUSSIAN ROULETTE</h1>
        <button
          class="rr-icon-btn"
          :class="{ active: showSettings }"
          @click="showSettings = !showSettings"
        >
          <Settings class="rr-icon" />
        </button>
      </header>

      <div v-if="showSettings" class="rr-settings-panel">
        <div class="rr-setting-row">
          <div class="rr-setting-info">
            <span class="rr-setting-label">{{
              t('games.roulette.settings.chamber_size_label')
            }}</span>
            <span class="rr-setting-desc"
              >Kammern in der Trommel (Max: 12)</span
            >
          </div>
          <div class="rr-control">
            <button class="rr-ctrl-btn" @click="adjustSetting('chamber', -1)">
              <Minus :size="16" />
            </button>
            <span class="rr-ctrl-val">{{ chamberSize }}</span>
            <button class="rr-ctrl-btn" @click="adjustSetting('chamber', 1)">
              <Plus :size="16" />
            </button>
          </div>
        </div>

        <div class="rr-setting-row">
          <div class="rr-setting-info">
            <span class="rr-setting-label">Patronen</span>
            <span class="rr-setting-desc">{{
              t('games.roulette.settings.bullet_count_label')
            }}</span>
          </div>
          <div class="rr-control">
            <button class="rr-ctrl-btn" @click="adjustSetting('bullet', -1)">
              <Minus :size="16" />
            </button>
            <span class="rr-ctrl-val">{{ bulletCount }}</span>
            <button class="rr-ctrl-btn" @click="adjustSetting('bullet', 1)">
              <Plus :size="16" />
            </button>
          </div>
        </div>

        <div class="rr-setting-row">
          <div class="rr-setting-info">
            <span class="rr-setting-label">Zylinder drehen</span>
            <span class="rr-setting-desc">Neu mischen nach Klickvorgang</span>
          </div>
          <div class="rr-toggle-wrapper">
            <label class="rr-toggle">
              <input v-model="spinAfterShot" type="checkbox" />
              <span class="rr-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="rr-info-board">
        <div
          class="rr-main-icon"
          :class="{ 'rr-pulse': isProcessing || status === 'dead' }"
        >
          <Skull v-if="status === 'dead'" :size="48" color="#ff4444" />
          <ShieldCheck
            v-else-if="status === 'won'"
            :size="48"
            color="#44ff88"
          />
          <Flame v-else :size="48" color="#f0b000" />
        </div>

        <div class="rr-stats">
          <div class="rr-stat-large">{{ oddsDisplay }}</div>
          <div
            class="rr-stat-small"
            :style="{
              color: probabilityPercentage > 50 ? '#ff4444' : '#aaaaaa',
            }"
          >
            {{ t('games.roulette.stats.mortality_label') }}:
            {{ Math.round(probabilityPercentage) }}%
          </div>
          <div class="rr-message">{{ gameStatusText }}</div>
        </div>
      </div>

      <div class="rr-visual-arena">
        <div class="rr-hammer-indicator"></div>
        <div
          class="rr-cylinder"
          :style="cylinderStyle"
          :class="{ 'rr-spinning': isProcessing && spinAfterShot }"
        >
          <div class="rr-center-pin"></div>

          <div
            v-for="(_, index) in chamberSize"
            :key="index"
            class="rr-chamber"
            :style="getChamberStyle(index)"
            :class="{
              'rr-chamber-shot': shotChambers.has(index) && status !== 'dead',
              'rr-chamber-fatal':
                status === 'dead' && index === currentChamberIndex,
              'rr-chamber-revealed':
                (status === 'dead' || status === 'won') && cylinder[index],
              'rr-chamber-safe':
                status === 'won' &&
                !cylinder[index] &&
                !shotChambers.has(index),
            }"
          >
            <div
              v-if="(status === 'dead' || status === 'won') && cylinder[index]"
              class="rr-bullet"
            ></div>
          </div>
        </div>
      </div>

      <div class="rr-actions">
        <button
          v-if="status === 'playing'"
          class="rr-btn-primary"
          :disabled="isProcessing"
          :class="{ 'rr-disabled': isProcessing }"
          @click="pullTrigger"
        >
          <Crosshair
            class="rr-btn-icon"
            :class="{ 'rr-spin': isProcessing && spinAfterShot }"
          />
          <span>{{
            isProcessing
              ? t('games.roulette.actions.spinning')
              : t('games.roulette.actions.shoot')
          }}</span>
        </button>

        <button
          v-if="status !== 'playing' || shotsFired > 0"
          class="rr-btn-secondary"
          @click="initGame"
        >
          <RefreshCw class="rr-btn-icon" />
          <span>{{ t('games.roulette.actions.reload') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Teko:wght@400;600;700&display=swap');

.rr-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 1rem;
  background-color: #050505;
  background-image: radial-gradient(circle at center, #1a1a1a 0%, #000000 100%);
  font-family: 'Inter', system-ui, sans-serif;
  color: #eeeeee;
}

.rr-game-card {
  width: 100%;
  max-width: 480px;
  background: #111111;
  border: 2px solid #2a2a2a;
  border-radius: 1.5rem;
  padding: 2rem;
  position: relative;
  overflow: hidden;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.8),
    0 0 0 1px inset rgba(255, 255, 255, 0.05);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.rr-dead-state {
  border-color: #aa1111;
  box-shadow:
    0 0 40px rgba(170, 17, 17, 0.3),
    0 0 0 1px inset rgba(255, 0, 0, 0.1);
  background: radial-gradient(ellipse at top, #2a0808 0%, #111111 80%);
}

.rr-won-state {
  border-color: #11aa44;
  box-shadow: 0 0 40px rgba(17, 170, 68, 0.2);
  background: radial-gradient(ellipse at top, #082a15 0%, #111111 80%);
}

.rr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  border-bottom: 1px solid #2a2a2a;
  padding-bottom: 1rem;
}

.rr-title {
  font-family: 'Teko', sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  margin: 0;
  color: #ffffff;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  line-height: 1;
}

.rr-icon-btn {
  background: transparent;
  border: none;
  color: #888888;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.rr-icon-btn:hover,
.rr-icon-btn.active {
  color: #ffffff;
  background: #2a2a2a;
}

.rr-settings-panel {
  background: #0a0a0a;
  border: 1px solid #333333;
  border-radius: 1rem;
  padding: 1rem;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.rr-setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rr-setting-info {
  display: flex;
  flex-direction: column;
}

.rr-setting-label {
  font-weight: 600;
  font-size: 0.95rem;
  color: #dddddd;
}

.rr-setting-desc {
  font-size: 0.75rem;
  color: #777777;
}

.rr-control {
  display: flex;
  align-items: center;
  background: #1a1a1a;
  border-radius: 0.5rem;
  border: 1px solid #333333;
}

.rr-ctrl-btn {
  background: transparent;
  color: #aaaaaa;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rr-ctrl-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.05);
}

.rr-ctrl-val {
  min-width: 2rem;
  text-align: center;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
}

.rr-toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}
.rr-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}
.rr-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #333;
  transition: 0.3s;
  border-radius: 24px;
}
.rr-slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}
.rr-toggle input:checked + .rr-slider {
  background-color: #f0b000;
}
.rr-toggle input:checked + .rr-slider:before {
  transform: translateX(20px);
}

.rr-info-board {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 2.5rem;
}

.rr-main-icon {
  background: #1a1a1a;
  width: 80px;
  height: 80px;
  border-radius: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid #333333;
}

.rr-pulse {
  animation: pulseIcon 1s infinite alternate;
}

@keyframes pulseIcon {
  from {
    transform: scale(1);
    filter: drop-shadow(0 0 0 rgba(255, 0, 0, 0));
  }
  to {
    transform: scale(1.05);
    filter: drop-shadow(0 0 10px rgba(255, 68, 68, 0.5));
  }
}

.rr-stats {
  display: flex;
  flex-direction: column;
}

.rr-stat-large {
  font-family: 'Teko', sans-serif;
  font-size: 3.5rem;
  line-height: 1;
  font-weight: 600;
  color: #ffffff;
}

.rr-stat-small {
  font-size: 0.85rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.rr-message {
  margin-top: 0.5rem;
  font-size: 1rem;
  color: #bbbbbb;
}

.rr-visual-arena {
  position: relative;
  width: 100%;
  height: 240px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 2rem;
  background: radial-gradient(
    circle at center,
    rgba(255, 255, 255, 0.03) 0%,
    transparent 60%
  );
}

.rr-hammer-indicator {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 15px solid #ff4444;
  z-index: 10;
  filter: drop-shadow(0 2px 4px rgba(255, 0, 0, 0.5));
}

.rr-cylinder {
  position: relative;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: linear-gradient(135deg, #222222, #111111);
  border: 4px solid #333333;
  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.8),
    inset 0 0 20px rgba(0, 0, 0, 1);
  transition: transform 1s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.rr-cylinder.rr-spinning {
  transition: transform 1.2s cubic-bezier(0.1, 0.9, 0.1, 1);
}

.rr-center-pin {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 30px;
  height: 30px;
  background: radial-gradient(circle, #444 0%, #111 100%);
  border-radius: 50%;
  border: 2px solid #555;
  box-shadow:
    inset 0 2px 4px rgba(255, 255, 255, 0.1),
    0 2px 5px rgba(0, 0, 0, 0.5);
}

.rr-chamber {
  position: absolute;
  top: 50%;
  left: 50%;
  margin-top: -15px;
  margin-left: -15px;
  border-radius: 50%;
  background: #0a0a0a;
  border: 2px solid #2a2a2a;
  box-shadow: inset 0 10px 10px rgba(0, 0, 0, 1);
  transform-origin: center center;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s;
}

.rr-chamber-shot {
  border-color: #444444;
  background: #1a1a1a;
  box-shadow: inset 0 0 15px rgba(255, 255, 255, 0.05);
}

.rr-chamber-shot::after {
  content: '';
  width: 40%;
  height: 40%;
  background: #2a2a2a;
  border-radius: 50%;
}

.rr-chamber-fatal {
  border-color: #ff4444;
  background: radial-gradient(circle, #ff0000 0%, #3a0000 100%);
  box-shadow:
    0 0 20px rgba(255, 0, 0, 0.6),
    inset 0 0 15px rgba(0, 0, 0, 0.8);
}

.rr-chamber-revealed {
  border-color: #f0b000;
}

.rr-chamber-safe {
  border-color: #44ff88;
}

.rr-bullet {
  width: 60%;
  height: 60%;
  background: radial-gradient(circle at 30% 30%, #ffd700, #b8860b);
  border-radius: 50%;
  box-shadow:
    inset -2px -2px 5px rgba(0, 0, 0, 0.5),
    0 2px 4px rgba(0, 0, 0, 0.5);
}

.rr-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.rr-btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  background: linear-gradient(to bottom, #f0b000, #b8860b);
  color: #000000;
  border: none;
  font-family: 'Teko', sans-serif;
  font-size: 1.8rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  padding: 0.75rem 2rem;
  border-radius: 1rem;
  cursor: pointer;
  box-shadow:
    0 4px 0 #8a6408,
    0 10px 20px rgba(240, 176, 0, 0.3);
  transition:
    all 0.1s active,
    transform 0.2s;
  text-transform: uppercase;
}

.rr-btn-primary:active:not(:disabled) {
  transform: translateY(4px);
  box-shadow:
    0 0 0 #8a6408,
    0 5px 10px rgba(240, 176, 0, 0.3);
}

.rr-btn-primary.rr-disabled {
  background: #333333;
  color: #777777;
  box-shadow: 0 4px 0 #1a1a1a;
  cursor: not-allowed;
}

.rr-dead-state .rr-btn-primary {
  display: none;
}

.rr-btn-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: #1a1a1a;
  color: #dddddd;
  border: 1px solid #333333;
  font-size: 1.1rem;
  font-weight: 500;
  padding: 1rem;
  border-radius: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.rr-btn-secondary:hover {
  background: #2a2a2a;
  color: #ffffff;
}

.rr-btn-icon {
  width: 24px;
  height: 24px;
}

.rr-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 480px) {
  .rr-game-card {
    padding: 1.5rem;
    border-radius: 1rem;
  }
}
</style>
