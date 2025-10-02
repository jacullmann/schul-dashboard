import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './style.css';
import VueGtag from 'vue-gtag-next'


const app = createApp(App);

function initAnalytics() {
    if (!(app as any)._context.provides['vue-gtag']) {
        app.use(VueGtag, {
            property: { id: 'G-Y9XSGT1NL4' }
        }, router)
    }
}

function removeAnalytics() {
    // GA-Skripte entfernen
    const scripts = document.querySelectorAll('script[src*="googletagmanager"],script[src*="google-analytics"]')
    scripts.forEach(s => s.remove())
    // DataLayer leeren
    ;(window as any).dataLayer = []
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

window.addEventListener('cookie-accepted', () => {
    initAnalytics()
})

window.addEventListener('cookie-revoked', () => {
    removeAnalytics()
})

app.use(createPinia());
app.use(router);
app.mount('#app');
