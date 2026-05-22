import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import { useEventListener } from '@vueuse/core';

export function useVideoPlayer(
  videoRef: Ref<HTMLVideoElement | null>,
  wrapperRef: Ref<HTMLElement | null>,
) {
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const duration = ref(0);
  const volume = ref(1);
  const isFullscreen = ref(false);
  const showControls = ref(true);

  const isFastForwarding = ref(false);
  const wasPlayingBeforeFastForward = ref(false);
  const showVolumeSlider = ref(false);
  let volumeTimeout: number;

  let controlsTimeout: number;
  let animationFrameId: number;

  let ffStartTime = 0;
  let ignoreNextClick = false;
  let ffTimer: number;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' + s : s}`;
  };

  const getSliderStyle = (current: number, max: number) => {
    const percent = max > 0 ? (current / max) * 100 : 0;
    return {
      background: `linear-gradient(to right, #fff 0%, #fff ${percent}%, #414141 ${percent}%, #414141 100%)`,
    };
  };

  const updateLoop = () => {
    if (videoRef.value && !videoRef.value.paused) {
      currentTime.value = videoRef.value.currentTime;
      animationFrameId = requestAnimationFrame(updateLoop);
    }
  };

  const handleVideoPlay = () => {
    isPlaying.value = true;
    updateLoop();
  };

  const handleVideoPause = () => {
    isPlaying.value = false;
    cancelAnimationFrame(animationFrameId);
  };

  const togglePlay = (e?: Event) => {
    if (ignoreNextClick) {
      ignoreNextClick = false;
      return;
    }
    if (e) e.stopPropagation();
    if (!videoRef.value) return;
    if (videoRef.value.paused) {
      videoRef.value.play();
    } else {
      videoRef.value.pause();
    }
  };

  const updateTime = () => {
  };

  const loadMetadata = () => {
    if (videoRef.value) duration.value = videoRef.value.duration;
  };

  const seek = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (videoRef.value) {
      const val = Number(target.value);
      videoRef.value.currentTime = val;
      currentTime.value = val;
    }
  };

  const updateVolume = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (videoRef.value) {
      volume.value = Number(target.value);
      videoRef.value.volume = volume.value;
    }
  };

  const toggleMute = () => {
    volume.value = volume.value === 0 ? 1 : 0;
    if (videoRef.value) {
      videoRef.value.volume = volume.value;
    }
  };

  const toggleFullscreen = () => {
    if (!videoRef.value) return;
    if (!document.fullscreenElement) {
      videoRef.value.parentElement?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleMouseMove = () => {
    showControls.value = true;
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
      if (isPlaying.value) showControls.value = false;
    }, 3000);
  };

  const handleMouseLeave = () => {
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
      if (isPlaying.value) showControls.value = false;
    }, 3000);
  };

  const startFastForward = (e: Event) => {
    if (e instanceof MouseEvent && e.button !== 0) return;
    if (!videoRef.value) return;

    ffStartTime = Date.now();
    wasPlayingBeforeFastForward.value = !videoRef.value.paused;

    ffTimer = setTimeout(() => {
      if (!videoRef.value) return;

      if (videoRef.value.paused) {
        videoRef.value.play();
      }

      videoRef.value.playbackRate = 2.0;
      isFastForwarding.value = true;
    }, 200);
  };

  const stopFastForward = () => {
    clearTimeout(ffTimer);
    if (!videoRef.value) return;

    if (ffStartTime === 0) return;

    const holdDuration = Date.now() - ffStartTime;

    if (holdDuration > 200) {
      ignoreNextClick = true;
      setTimeout(() => {
        ignoreNextClick = false;
      }, 100);
    }

    if (isFastForwarding.value) {
      videoRef.value.playbackRate = 1.0;
      isFastForwarding.value = false;
    }

    if (holdDuration > 200) {
      if (!wasPlayingBeforeFastForward.value) {
        videoRef.value.pause();
      } else {
        videoRef.value.play();
      }
    }

    ffStartTime = 0;
  };

  const handleVolumeEnter = () => {
    clearTimeout(volumeTimeout);
    showVolumeSlider.value = true;
  };

  const handleVolumeLeave = () => {
    volumeTimeout = setTimeout(() => {
      showVolumeSlider.value = false;
    }, 1000);
  };

  const handleGlobalKeydown = (e: KeyboardEvent) => {
    if (!videoRef.value) return;

    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT'
    ) {
      return;
    }

    switch (e.key) {
      case ' ':
      case 'k':
      case 'K':
        e.preventDefault();
        togglePlay();
        handleMouseMove();
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (videoRef.value) {
          videoRef.value.currentTime += 5;
          currentTime.value = videoRef.value.currentTime;
        }
        handleMouseMove();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (videoRef.value) {
          videoRef.value.currentTime -= 5;
          currentTime.value = videoRef.value.currentTime;
        }
        handleMouseMove();
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (videoRef.value) {
          const newVol = Math.min(1, volume.value + 0.1);
          volume.value = newVol;
          videoRef.value.volume = newVol;
        }
        handleMouseMove();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (videoRef.value) {
          const newVol = Math.max(0, volume.value - 0.1);
          volume.value = newVol;
          videoRef.value.volume = newVol;
        }
        handleMouseMove();
        break;
      case 'm':
      case 'M':
        volume.value = volume.value === 0 ? 1 : 0;
        if (videoRef.value) videoRef.value.volume = volume.value;
        handleMouseMove();
        break;
      case 'f':
      case 'F':
        toggleFullscreen();
        break;
    }
  };

  const handleFullscreenChange = () => {
    isFullscreen.value = !!document.fullscreenElement;
  };

  useEventListener(wrapperRef, 'keydown', handleGlobalKeydown);
  useEventListener(document, 'fullscreenchange', handleFullscreenChange);

  onMounted(() => {
    if (wrapperRef.value) wrapperRef.value.setAttribute('tabindex', '0');
  });

  onUnmounted(() => {
    clearTimeout(controlsTimeout);
    clearTimeout(volumeTimeout);
    cancelAnimationFrame(animationFrameId);
  });

  return {
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
  };
}
