import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './style.css';
import { createGtag } from 'vue-gtag'

const app = createApp(App);

app.use(createGtag, {
    property: {
        id: 'G-KR6Q5TQTTN' // <-- deine GA4 Measurement ID
    }
}, router)

app.use(createPinia());
app.use(router);
app.mount('#app');
