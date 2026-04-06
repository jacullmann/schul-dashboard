<script setup lang="ts">
import {
  Play,
  Pause,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  FastForward,
} from '@lucide/vue';
import { ref } from 'vue';
import { useVideoPlayer } from '@/modules/infodashboard/composables/useVideoPlayer';

defineProps<{
  src: string;
  poster?: string;
}>();

const videoRef = ref<HTMLVideoElement | null>(null);
const wrapperRef = ref<HTMLElement | null>(null);

const {
  isPlaying,
  currentTime,
  duration,
  volume,
  isFullscreen,
  showControls,
  isFastForwarding,
  showVolumeSlider,
  formatTime,
  getSliderStyle,
  handleVideoPlay,
  handleVideoPause,
  togglePlay,
  updateTime,
  loadMetadata,
  seek,
  updateVolume,
  toggleMute,
  toggleFullscreen,
  handleMouseMove,
  handleMouseLeave,
  startFastForward,
  stopFastForward,
  handleVolumeEnter,
  handleVolumeLeave,
} = useVideoPlayer(videoRef, wrapperRef);
</script>

<template>
  <div
    ref="wrapperRef"
    class="video-wrapper"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <transition name="fade">
      <div
        v-if="isFastForwarding"
        class="fast-forward-overlay"
        role="status"
        aria-live="polite"
      >
        <span>2x</span>
        <FastForward
          fill="currentColor"
          :size="24"
          :stroke-width="2"
          absoluteStrokeWidth
          aria-hidden="true"
        />
      </div>
    </transition>

    <video
      ref="videoRef"
      class="main-video"
      :src="src"
      :poster="poster"
      @click="togglePlay"
      @timeupdate="updateTime"
      @loadedmetadata="loadMetadata"
      @mousedown="startFastForward"
      @mouseup="stopFastForward"
      @mouseleave="stopFastForward"
      @touchstart="startFastForward"
      @touchend="stopFastForward"
      @play="handleVideoPlay"
      @pause="handleVideoPause"
      @ended="handleVideoPause"
    ></video>

    <div
      class="video-controls"
      :class="{
        'controls-hidden': (!showControls && isPlaying) || isFastForwarding,
      }"
    >
      <div class="scrub-bar-container">
        <input
          type="range"
          min="0"
          :max="duration"
          :value="currentTime"
          step="0.01"
          @input="seek"
          class="scrub-bar"
          :style="getSliderStyle(currentTime, duration)"
          aria-label="Video spulen"
        />
      </div>

      <div class="controls-row">
        <div class="controls-left">
          <button
            type="button"
            class="player-btn"
            @click="togglePlay"
            :aria-label="isPlaying ? 'Pausieren' : 'Abspielen'"
          >
            <Pause
              v-if="isPlaying"
              fill="currentColor"
              :size="24"
              :stroke-width="2"
              absoluteStrokeWidth
            />
            <Play
              v-else
              fill="currentColor"
              :size="24"
              :stroke-width="2"
              absoluteStrokeWidth
            />
          </button>

          <div
            class="volume-control-group"
            @mouseenter="handleVolumeEnter"
            @mouseleave="handleVolumeLeave"
          >
            <button
              type="button"
              class="player-btn"
              @click="toggleMute"
              :aria-label="volume === 0 ? 'Ton einschalten' : 'Stummschalten'"
            >
              <VolumeX
                v-if="volume === 0"
                fill="currentColor"
                :size="24"
                :stroke-width="2"
                absoluteStrokeWidth
                aria-hidden="true"
              />
              <Volume2
                v-else
                :size="24"
                fill="currentColor"
                :stroke-width="2"
                absoluteStrokeWidth
                aria-hidden="true"
              />
            </button>
            <div
              class="volume-slider-wrapper"
              :class="{ visible: showVolumeSlider }"
            >
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                :value="volume"
                @input="updateVolume"
                class="volume-slider"
                :style="getSliderStyle(volume, 1)"
                aria-label="Lautstärke"
              />
            </div>
          </div>

          <span class="time-display"
            >{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span
          >
        </div>

        <div class="controls-right">
          <button
            type="button"
            class="player-btn"
            @click="toggleFullscreen"
            :aria-label="
              isFullscreen
                ? 'Vollbildmodus beenden'
                : 'Vollbildmodus aktivieren'
            "
          >
            <Minimize
              v-if="isFullscreen"
              :size="24"
              :stroke-width="2"
              absoluteStrokeWidth
            />
            <Maximize v-else :size="24" :stroke-width="2" absoluteStrokeWidth />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.video-wrapper {
  position: relative;
  width: 100%;
  background: var(--color-black);
  border-radius: 0;
  overflow: hidden;
  aspect-ratio: 16/9;
}

.main-video {
  width: 100%;
  height: 100%;
  display: block;
}

.video-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: opacity 0.3s;
}

.controls-hidden {
  opacity: 0;
  pointer-events: none;
}

.controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.controls-left,
.controls-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.player-btn {
  background: none;
  border: none;
  color: var(--color-white);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.time-display {
  font-size: 12px;
  font-family: monospace;
  color: var(--color-on-surface);
}

.scrub-bar-container {
  width: 100%;
  display: flex;
  align-items: center;
}

.scrub-bar {
  width: 100%;
  cursor: pointer;
}

.volume-control-group {
  display: flex;
  align-items: center;
}

.volume-slider-wrapper {
  width: 0;
  transition:
    width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.3s ease;
  opacity: 1;
  display: flex;
  align-items: center;
  margin-left: 0;
}

.volume-slider-wrapper.visible {
  width: 70px;
  opacity: 1;
  margin-left: 8px;
}

.volume-slider {
  width: 60px;
  flex-shrink: 0;
}

.fast-forward-overlay {
  position: absolute;
  top: 5%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(65, 65, 65, 0.6);
  padding: 8px 16px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-white);
  pointer-events: none;
  z-index: 20;
}

/* --- SLIDER STYLING --- */
input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  background: transparent;
  cursor: pointer;
  border-radius: var(--radius-full);
  height: 4px;
  margin: 0;
  border: none;
  background-size: 100% 4px;
  background-position: center;
  background-repeat: no-repeat;
}

input[type='range']::-webkit-slider-runnable-track {
  width: 100%;
  height: 4px;
  cursor: pointer;
  background: transparent;
  border-radius: var(--radius-full);
  border: none;
}

input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 12px;
  width: 12px;
  border-radius: 50%;
  background: var(--color-white);
  cursor: pointer;
  margin-top: -4px;
  transform: scale(0);
  transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

input[type='range']:hover::-webkit-slider-thumb {
  transform: scale(1);
}

input[type='range']::-moz-range-track {
  width: 100%;
  height: 4px;
  cursor: pointer;
  background: transparent;
  border-radius: var(--radius-full);
  border: none;
}

input[type='range']::-moz-range-thumb {
  height: 12px;
  width: 12px;
  border: none;
  border-radius: 50%;
  background: var(--color-white);
  cursor: pointer;
  transform: scale(0);
  transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}

input[type='range']:hover::-moz-range-thumb {
  transform: scale(1);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
