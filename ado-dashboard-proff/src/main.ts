import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './style.css';
import VueGtag from 'vue-gtag-next'


const app = createApp(App);

// GA nur laden, wenn Zustimmung da ist
function initAnalytics() {
    app.use(VueGtag, {
        property: {
            id: 'G-KR6Q5TQTTN'
        }
    }, router)
}

// Prüfen ob schon zugestimmt
const consent = localStorage.getItem('cookie_consent')
if (consent) {
    const parsed = JSON.parse(consent)
    const expires = new Date(parsed.expires)
    if (parsed.accepted && new Date() < expires) {
        initAnalytics()
    }
}

// Warten auf Event vom Banner
window.addEventListener('cookie-accepted', () => {
    initAnalytics()
})

app.use(createPinia());
app.use(router);
app.mount('#app');
