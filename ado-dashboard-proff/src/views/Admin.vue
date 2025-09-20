<template>
  <div class="card">
    <h2 style="margin-top:0;">Admin</h2>

    <div v-if="!token" class="row">
      <div class="col">
        <input class="input" v-model="email" placeholder="E-Mail" />
      </div>
      <div class="col">
        <input class="input" v-model="password" placeholder="Passwort" type="password" />
      </div>
      <div><button class="btn" @click="login">Login</button></div>
      <div v-if="loginError" class="small" style="color:var(--danger)">{{ loginError }}</div>
    </div>

    <div v-else>
      <div class="row" style="align-items:center;">
        <div class="badge">Eingeloggt als {{ email }}</div>
        <button class="btn ghost" @click="logout">Logout</button>
      </div>
      <hr />
      <h3>Moderation</h3>
      <div class="row">
        <div class="col">
          <h4>Banliste</h4>
          <div class="row">
            <div class="col"><input class="input" v-model="newWord" placeholder="Wort hinzufügen"/></div>
            <div><button class="btn" @click="addWord">Hinzufügen</button></div>
          </div>
          <ul>
            <li v-for="w in banlist" :key="w._id" style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid var(--border);">
              <span>{{ w.word }}</span>
              <button class="btn danger" @click="delWord(w.word)">Löschen</button>
            </li>
          </ul>
        </div>

        <div class="col">
          <h4>Person auswählen</h4>
          <div class="row">
            <div class="col"><input class="input" v-model="q" placeholder="Suche"/></div>
            <div class="col">
              <select v-model="title" class="input">
                <option value="">Alle</option>
                <option>Herr</option>
                <option>Frau</option>
              </select>
            </div>
            <div><button class="btn" @click="loadPersons">Suchen</button></div>
          </div>
          <div style="max-height:200px; overflow:auto; border:1px solid var(--border); border-radius:8px; margin-top:8px;">
            <div v-for="p in persons" :key="p.id" style="padding:8px; cursor:pointer;" @click="selectPerson(p.id)">
              {{ p.title }} {{ p.nameUpper }} — {{ p.ratingsCount }} / {{ p.avgOverall.toFixed(2) }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="selPerson" class="row" style="margin-top:16px;">
        <div class="col">
          <h4>Bewertungen</h4>
          <div v-for="r in ratings" :key="r.id" class="card" style="margin-bottom:8px;">
            <div class="small">von {{ r.anonUserId }} — {{ new Date(r.createdAt).toLocaleString() }}</div>
            <div class="small">IP: {{ r.ip || '—' }} | Agent: {{ r.userAgent || '—' }}</div>
            <div style="margin-top:8px;">
              <div v-for="k in categories" :key="k">{{ pretty(k) }}: {{ r.categories[k] }}</div>
              <div style="margin-top:6px;">Gesamt: <strong>{{ r.overall }}</strong></div>
            </div>
            <div class="row" style="margin-top:8px;">
              <button class="btn warn" @click="editRating(r)">Bearbeiten</button>
              <button class="btn danger" @click="deleteRating(r.id)">Löschen</button>
            </div>
          </div>
        </div>

        <div class="col">
          <h4>Nachrichten</h4>
          <div class="row">
            <div class="col"><input class="input" v-model="adminMsg" placeholder="Als Admin schreiben"/></div>
            <div><button class="btn" @click="sendAdminMsg">Senden</button></div>
          </div>
          <div style="max-height:300px; overflow:auto; border:1px solid var(--border); border-radius:8px; margin-top:8px;">
            <div v-for="m in messages" :key="m.id" class="card" :style="{ borderColor: m.pinned ? 'var(--warn)' : 'var(--border)'}">
              <div class="small">
                <span v-if="m.isAdmin" class="badge">ADMIN</span>
                {{ new Date(m.createdAt).toLocaleString() }} — {{ m.anonUserId }}
                <span v-if="m.pinned" class="badge">PINNED</span>
              </div>
              <div style="margin-top:6px; white-space:pre-wrap;">{{ m.content }}</div>
              <div class="row" style="margin-top:8px;">
                <button class="btn warn" @click="togglePin(m)">{{ m.pinned ? 'Unpinnen' : 'Anpinnen' }}</button>
                <button class="btn" @click="editMessage(m)">Bearbeiten</button>
                <button class="btn danger" @click="deleteMessage(m.id)">Löschen</button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import api, { setAdminToken } from '../api';

const email = ref('');
const password = ref('');
const token = ref(localStorage.getItem('admin_token') || '');
const loginError = ref('');

const banlist = ref<any[]>([]);
const newWord = ref('');

const q = ref('');
const title = ref('');
const persons = ref<any[]>([]);
const selPerson = ref<string>('');
const ratings = ref<any[]>([]);
const messages = ref<any[]>([]);
const adminMsg = ref('');
const categories = ['Freundlichkeit','Kompetenz','Puenktlichkeit','Fairness','Erklaeren','Organisation'];

function pretty(k: string) {
  return k === 'Puenktlichkeit' ? 'Pünktlichkeit' : k === 'Erklaeren' ? 'Erklären' : k;
}

async function login() {
  loginError.value = '';
  try {
    const { data } = await api.post('/api/admin/login', { email: email.value, password: password.value });
    token.value = data.token;
    setAdminToken(data.token);
    await loadBanlist();
  } catch (e: any) {
    loginError.value = e?.response?.data?.error || 'Login fehlgeschlagen';
  }
}
function logout() {
  token.value = '';
  setAdminToken(null);
}

async function loadBanlist() {
  if (!token.value) return;
  const { data } = await api.get('/api/admin/banlist');
  banlist.value = data;
}
async function addWord() {
  if (!newWord.value.trim()) return;
  await api.post('/api/admin/banlist', { word: newWord.value.trim() });
  newWord.value = '';
  await loadBanlist();
}
async function delWord(w: string) {
  await api.delete(`/api/admin/banlist/${encodeURIComponent(w)}`);
  await loadBanlist();
}

async function loadPersons() {
  const { data } = await api.get('/api/persons', { params: { q: q.value, title: title.value || undefined } });
  persons.value = data;
}
async function selectPerson(id: string) {
  selPerson.value = id;
  const [r, m] = await Promise.all([
    api.get(`/api/admin/persons/${id}/ratings`),
    api.get(`/api/admin/persons/${id}/messages`)
  ]);
  ratings.value = r.data;
  messages.value = m.data;
}
async function deleteRating(id: string) {
  await api.delete(`/api/admin/ratings/${id}`);
  if (selPerson.value) await selectPerson(selPerson.value);
}
async function deleteMessage(id: string) {
  try {
    await api.delete(`/api/admin/messages/${id}`);
    if (selPerson.value) {
      await selectPerson(selPerson.value);
    }
  } catch (e) {
    console.error('Fehler beim Löschen der Nachricht', e);
  }
}
async function editRating(r: any) {
  const next: any = {};
  for (const k of categories) {
    const v = Number(prompt(`${pretty(k)} (1-6):`, String(r.categories[k])));
    if (Number.isFinite(v)) next[k] = v;
  }
  await api.patch(`/api/admin/ratings/${r.id}`, { categories: next });
  if (selPerson.value) await selectPerson(selPerson.value);
}
async function sendAdminMsg() {
  if (!selPerson.value || !adminMsg.value.trim()) return;
  await api.post(`/api/admin/persons/${selPerson.value}/messages`, { content: adminMsg.value });
  adminMsg.value = '';
  await selectPerson(selPerson.value);
}
async function togglePin(m: any) {
  await api.patch(`/api/admin/messages/${m.id}`, { pinned: !m.pinned });
  await selectPerson(selPerson.value);
}
async function editMessage(m: any) {
  const text = prompt('Nachricht bearbeiten', m.content);
  if (text === null) return;
  await api.patch(`/api/admin/messages/${m.id}`, { content: text });
  await selectPerson(selPerson.value);
}

if (token.value) {
  loadBanlist();
}
</script>
