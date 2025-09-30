import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './style.css';
import VueGtag from 'vue-gtag-next'


const app = createApp(App);

app.use(VueGtag, {
    property: {
        id: 'G-KR6Q5TQTTN'
    }
}, router)

app.use(createPinia());
app.use(router);
app.mount('#app');
