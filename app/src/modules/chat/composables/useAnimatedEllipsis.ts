import { ref, onMounted, onUnmounted } from 'vue';

export function useAnimatedEllipsis() {
  const dots = ref('');
  let interval: ReturnType<typeof setInterval>;

  onMounted(() => {
    interval = setInterval(() => {
      dots.value = dots.value.length >= 3 ? '' : dots.value + '.';
    }, 400);
  });

  onUnmounted(() => {
    clearInterval(interval);
  });

  return dots;
}
