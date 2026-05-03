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
    class="relative w-full bg-black rounded-none overflow-hidden aspect-video"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <Transition name="fade">
      <div
        v-if="isFastForwarding"
        class="absolute top-[5%] left-1/2 -translate-x-1/2 bg-[rgba(0,0,0,0.6)] border border-[rgba(65,65,65,0.6)] px-4 py-2 rounded-full flex items-center gap-2 text-white pointer-events-none z-20"
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
    </Transition>

    <video
      ref="videoRef"
      class="w-full h-full block"
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
      class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[rgba(0,0,0,0.8)] to-transparent p-4 flex flex-col gap-4 transition-opacity duration-300"
      :class="{
        'opacity-0 pointer-events-none':
          (!showControls && isPlaying) || isFastForwarding,
      }"
    >
      <div class="w-full flex items-center">
        <input
          type="range"
          min="0"
          :max="duration"
          :value="currentTime"
          step="0.01"
          @input="seek"
          class="player-range"
          :style="getSliderStyle(currentTime, duration)"
          aria-label="Video spulen"
        />
      </div>

      <div class="flex justify-between items-center">
        <div class="flex items-center gap-4">
          <button
            type="button"
            class="bg-transparent border-none text-white cursor-pointer p-0 flex items-center justify-center"
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
            class="flex items-center"
            @mouseenter="handleVolumeEnter"
            @mouseleave="handleVolumeLeave"
          >
            <button
              type="button"
              class="bg-transparent border-none text-white cursor-pointer p-0 flex items-center justify-center"
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
              class="w-0 transition-[width,opacity] duration-300 opacity-0 flex items-center ml-0"
              :class="{ 'w-[70px] opacity-100 ml-2': showVolumeSlider }"
            >
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                :value="volume"
                @input="updateVolume"
                class="player-range w-[60px] flex-shrink-0"
                :style="getSliderStyle(volume, 1)"
                aria-label="Lautstärke"
              />
            </div>
          </div>

          <span class="text-xs font-mono text-on-ghost"
            >{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span
          >
        </div>

        <div class="flex items-center gap-4">
          <button
            type="button"
            class="bg-transparent border-none text-white cursor-pointer p-0 flex items-center justify-center"
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
