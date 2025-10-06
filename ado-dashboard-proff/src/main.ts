import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './style.css';
import VueGtag from 'vue-gtag-next'
import gaDirective from './directives/gaEvent'

const app = createApp(App);

function initAnalytics() {
    if (!(app as any)._context.provides['vue-gtag']) {
        app.use(VueGtag, {
            property: { id: 'G-8H1WEQSLN4' }
        }, router)
    }
}

function removeAnalytics() {
    const scripts = document.querySelectorAll('script[src*="googletagmanager"],script[src*="google-analytics"]')
    scripts.forEach(s => s.remove())
    ;(window as any).dataLayer = []
}

async function checkSiteAccess(): Promise<boolean> {
    try {
        const res = await fetch('/api/auth/access/verify', { method: 'GET', credentials: 'include' });
        if (!res.ok) return false;
        const j = await res.json();
        return j?.ok === true;
    } catch {
        return false;
    }
}

// Router guard: blockiere alle Routen ausser /login wenn nicht eingeloggt
router.beforeEach(async (to, from, next) => {
    const publicPaths = ['/login'];
    if (publicPaths.includes(to.path)) {
        const ok = await checkSiteAccess();
        if (ok) return next('/');
        return next();
    }
    const ok = await checkSiteAccess();
    if (!ok) return next('/login');
    return next();
});

function setupCookieConsentListeners() {
    // Prüfe localStorage consent nur wenn eingeloggt
    const consent = localStorage.getItem('cookie_consent');
    if (consent) {
        const parsed = JSON.parse(consent);
        const expires = new Date(parsed.expires);
        if (parsed.accepted && new Date() < expires) {
            initAnalytics();
        }
    }
    window.addEventListener('cookie-accepted', () => { initAnalytics(); });
    window.addEventListener('cookie-revoked', () => { removeAnalytics(); });
}

app.directive('ga-event', gaDirective);
app.use(createPinia());
app.use(router);

// reaktives Login-Signal optional über window events im App.vue
window.addEventListener('site-logged-in', () => { setupCookieConsentListeners(); });
window.addEventListener('site-logged-out', () => { removeAnalytics(); });

app.mount('#app');
