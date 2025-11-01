import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { useAuth } from './composables/useAuth';
import App from './App.vue';
import './style.css';
import VueGtag from 'vue-gtag-next';
import naive from 'naive-ui'
import router from './router';

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
app.use(naive)



