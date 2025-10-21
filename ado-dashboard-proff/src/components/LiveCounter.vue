<template>
  <div class="online-counter">
    <div class="badge">Online: <strong>{{ count }}</strong></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { io, Socket } from 'socket.io-client';
import hw from "../hwApi";

const count = ref<number>(0);


let socket: Socket | null = null;

onMounted(() => {
  socket = io(hw, {
    autoConnect: true,
    // transports: ['websocket'], // optional
  });

  socket.on('connect', () => {
    // falls du token-basiert authentifizieren willst:
    // if (token) socket?.emit('auth', token);
  });

  socket.on('onlineCount', (n: number) => {
    count.value = Number(n) || 0;
  });

  // optional: request initial count via REST if you prefer
  // fetch(`${BACKEND}/api/online-count`).then(...)
});

onBeforeUnmount(() => {
  socket?.disconnect();
  socket = null;
});
</script>

<style scoped>
.online-counter { display:inline-block; }
.badge { padding:6px 10px; border-radius:6px; background:var(--surface); border:1px solid var(--border); }
</style>
