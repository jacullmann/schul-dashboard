import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './style.css';
import VueGtag from 'vue-gtag-next';
import gaDirective from './directives/gaEvent';
import { useAuth } from './composables/useAuth';
import PrimeVue from 'primevue/config';
import naive from 'naive-ui'

const app = createApp(App);


function initAnalytics() {
    if (!(app as any)._context.provides['vue-gtag']) {
        app.use(VueGtag, {
            property: { id: 'G-8H1WEQSLN4' }
        }, router);
    }
}

function removeAnalytics() {
    const scripts = document.querySelectorAll('script[src*="googletagmanager"],script[src*="google-analytics"]');
    scripts.forEach(s => s.remove());
    (window as any).dataLayer = [];
}

const auth = useAuth();


const consent = localStorage.getItem('cookie_consent');
if (consent) {
    try {
        const parsed = JSON.parse(consent);
        const expires = new Date(parsed.expires);
        if (parsed.accepted && new Date() < expires) {
            //initAnalytics();
        }
    } catch {
        // ignore
    }
}

window.addEventListener('cookie-accepted', () => {
    //initAnalytics();
});

window.addEventListener('cookie-revoked', () => {
    //removeAnalytics();
});

app.directive('ga-event', gaDirective);
app.use(createPinia());
app.use(router);
app.mount('#app');
app.use(PrimeVue, {
    unstyled: true,
});
app.use(naive)


// Aktivitätsbasierte Verlängerung der Session-Expiry (optional)
window.addEventListener('mousemove', () => { if (auth.isAuthenticated.value) auth.refreshExpiry(); });
window.addEventListener('keydown', () => { if (auth.isAuthenticated.value) auth.refreshExpiry(); });

// Reagiere auf Auth-Änderungen (z. B. Login/Logout) global
window.addEventListener('auth-changed', () => {
    // einfache Seite neu laden / Router neu evaluieren
    // Router-Guard liest den Auth-Status neu ein
    // Wenn du kein Hard-Reload willst, entferne die folgende Zeile
    // location.reload();
});


