import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './style.css';
import VueGtag from 'vue-gtag'

const app = createApp(App);

app.use(VueGtag, {
    config: { id: 'G-KR6Q5TQTTN' } // <-- deine GA4 Measurement ID hier einfügen
}, router)

app.use(createPinia());
app.use(router);
app.mount('#app');
