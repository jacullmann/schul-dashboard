import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { useAuth } from './composables/useAuth';
import App from './App.vue';
import './style.css';
import naive from 'naive-ui'
import router from './router';
import { loadBadWords } from './composables/useProfanity'

const app = createApp(App);

await loadBadWords();



app.use(createPinia());
app.use(router);
app.mount('#app');
app.use(naive)



