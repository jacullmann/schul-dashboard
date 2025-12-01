import { createRouter, createWebHistory } from 'vue-router';
import Hausaufgaben from './views/Hausaufgaben.vue';
import { useAuth } from './composables/useAuth';
import { useLoadingBar } from './composables/loadingState';
import hw from './hwApi';

const VerifyEmail = () => import('./views/VerifyEmail.vue');
const Kuerzel = () => import('./views/tools/Kuerzel.vue');
const Ye = () => import('./views/Ye.vue');
const BS = () => import('./views/BS.vue');
const Kontakt = () => import('./components/ContactForm.vue');
const AuthPage = () => import('./views/AuthPage.vue');
const Aidetector = () => import('./views/aiDetector.vue')
const Games = () => import('./views/Games.vue')
const GameDetail = () => import('./views/GameDetail.vue')
const Finales = () => import('./components/Finaleb.vue')
const Countdown = () => import('./views/Countdown.vue')
const AdminDashboard = () => import('./views/AdminDashboard.vue');
const DaltonFinder = () => import('./views/tools/DaltonFinder.vue')

const routes = [
    { path: '/', redirect: '/items/HAUSAUFGABE' },
    { path: '/welcome', name: 'Auth', component: AuthPage, meta: { title: 'Anmeldung' } },
    { path: '/items/:type?', name: 'ItemsByType', component: Hausaufgaben, props: true, meta: { title: 'Hausaufgaben' } },

    {
        path: '/admin-dashboard',
        name: 'AdminDashboard',
        component: AdminDashboard,
        meta: { title: 'Admin Dashboard', requiresAdmin: true }
    },

    { path: '/hausaufgaben/verify', redirect: '/verify' },
    { path: '/verify', component: VerifyEmail, meta: { title: 'E-Mail Verifizierung' } },
    { path: '/kuerzel', component: Kuerzel, meta: { title: 'Kürzel-Finder' } },
    { path: '/kanye', component: Ye, meta: { title: 'Kanye' } },
    { path: '/ai-detector', component: Aidetector, meta: { title: 'AI Detektor' } },
    { path: '/sorgenbox', component: BS, meta: { title: 'Sorgenbox' } },
    { path: '/kontakt', component: Kontakt, meta: { title: 'Kontakt' } },
    { path: '/spiele', component: Games, meta: { title: 'Spiel Übersicht' } },
    { path: '/stundenplan', component: Finales, meta: { title: 'Stundenplan' } },
    { path: '/daltonraumfinder', component: DaltonFinder, meta: { title: 'Daltonraum-Finder' } },
    { path: '/countdown', component: Countdown, meta: { title: 'Countdown' } },
    {
        path: '/spiele/:id',
        name: 'GameDetail',
        component: GameDetail,
        props: true,
        meta: { title: 'Spiel' }
    },
    { path: '/goat', redirect: '/kanye' },

    {
        path: '/impressum-&-datenschutz',
        component: () => import('./views/legal/LegalLayout.vue'),
        children: [
            { path: 'impressum', component: () => import('./views/legal/ImpressumPage.vue'), meta: { title: 'Impressum' } },
            { path: 'datenschutzerklaerung', component: () => import('./views/legal/DatenschutzPage.vue'), meta: { title: 'Datenschutzerklärung' } }
        ]
    },
    { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('./views/NotFound.vue'), meta: { title: '404' } }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

const { start, finish } = useLoadingBar();
const { isAuthenticated, isAuthReady, initAuth } = useAuth();

router.beforeEach(async (to, from, next) => {
    // 1. Loading Bar starten
    if (to.path !== from.path) start();

    // 2. Auth initialisieren falls nötig
    if (!isAuthReady.value) {
        await initAuth();
    }

    // 3. Globaler Auth Check (außer Welcome)
    if (to.path !== '/welcome' && !isAuthenticated.value) {
        finish();
        return next({ path: '/welcome' });
    }

    // 4. Titel setzen
    if (to.meta.title) {
        document.title = to.meta.title + ' | Dashboard';
    } else {
        document.title = 'Dashboard';
    }

    // 5. Admin Guard für die neue Route
    if (to.meta.requiresAdmin) {
        try {
            // Wir müssen sicherstellen, dass wir wissen, ob der User Admin ist.
            // Da useAuth nur Token prüft, machen wir einen schnellen Check oder laden 'me'
            // Idealerweise cached useAuth den User, aber wir nutzen hier hwApi direkt.
            const { data } = await hw.get('/api/auth/me');
            if (data && data.isAdmin) {
                return next();
            } else {
                console.warn('Zugriff verweigert: Kein Admin');
                return next({ path: '/items/HAUSAUFGABE' });
            }
        } catch (e) {
            console.error('Admin Check fehlgeschlagen', e);
            return next({ path: '/items/HAUSAUFGABE' });
        }
    }

    next();
});

router.afterEach(() => {
    finish();
});

export default router;