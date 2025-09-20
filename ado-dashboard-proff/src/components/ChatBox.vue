<template>
  <div>
    <div style="height: 300px; overflow: auto; border:1px solid var(--border); border-radius: 10px; padding: 8px;" ref="box">
      <div v-for="m in messages" :key="m.id" class="card" :style="{ margin:'8px 0', borderColor: m.pinned ? 'var(--warn)' : 'var(--border)'}">
        <div class="small">
          <span v-if="m.isAdmin" class="badge">ADMIN</span>
          {{ new Date(m.createdAt).toLocaleString() }} — {{ m.anonUserId }}
          <span v-if="m.pinned" class="badge">PINNED</span>
        </div>
        <div style="margin-top:6px; white-space: pre-wrap;">{{ m.content }}</div>
      </div>
    </div>
    <div class="row" style="margin-top:8px;">
      <div class="col"><input class="input" v-model="text" placeholder="Nachricht schreiben..." @keyup.enter="send"/></div>
      <div><button class="btn" @click="send">Senden</button></div>
    </div>
    <div v-if="error" class="small" style="color:var(--danger); margin-top:6px;">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, nextTick } from 'vue';
import api from '../api';
import { useAnon } from '../store/useAnon';
import { socket } from '../socket';

const props = defineProps<{ personId: string }>();

const messages = ref<any[]>([]);
const text = ref('');
const error = ref('');
const box = ref<HTMLDivElement | null>(null);

function autoScroll() {
  nextTick(() => {
    if (box.value) box.value.scrollTop = box.value.scrollHeight;
  });
}

async function load() {
  const { data } = await api.get(`/api/persons/${props.personId}/messages`);
  messages.value = data.sort((a:any,b:any) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  autoScroll();
}

async function send() {
  error.value = '';
  const t = text.value.trim();
  if (!t) return;
  try {
    const anon = useAnon(); anon.ensure();
    await api.post(`/api/persons/${props.personId}/messages`, { content: t, anonUserId: anon.id });
    text.value = '';
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Senden fehlgeschlagen';
  }
}

function onNew(msg:any) {
  if (msg.personId !== props.personId) return;
  messages.value.push(msg);
  autoScroll();
}
function onUpdate(msg:any) {
  const i = messages.value.findIndex(m => m.id === msg.id);
  if (i >= 0) {
    messages.value[i] = { ...messages.value[i], ...msg };
  }
}
function onDelete(msg:any) {
  messages.value = messages.value.filter(m => m.id !== msg.id);
}

onMounted(() => {
  load();
  socket.emit('room:join', props.personId);
  socket.on('message:new', onNew);
  socket.on('message:update', onUpdate);
  socket.on('message:delete', onDelete);
});
onUnmounted(() => {
  socket.off('message:new', onNew);
  socket.off('message:update', onUpdate);
  socket.off('message:delete', onDelete);
});
</script>
