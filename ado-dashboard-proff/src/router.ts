import { createRouter, createWebHistory } from 'vue-router';
import Hausaufgaben from './views/Hausaufgaben.vue';
import { useAuth } from './composables/useAuth';

const PersonDetail = () => import('./views/PersonDetail.vue');
const Admin = () => import('./views/Admin.vue');
const Home = () => import('./views/Home.vue');
const VerifyEmail = () => import('./views/VerifyEmail.vue');
const Kuerzel = () => import('./views/Kuerzel.vue');
const Ye = () => import('./views/Ye.vue');
const BS = () => import('./views/BS.vue');
const Kontakt = () => import('./components/ContactForm.vue');
const AuthPage = () => import('./views/AuthPage.vue');
const Aidetector = () => import('./views/aiDetector.vue')
const Games = () => import('./views/Games.vue')
const GameDetail = () => import('./views/GameDetail.vue')
//const News = () => import('./views/News.vue')
const Finales = () => import('./components/Finaleb.vue')
const Countdown = () => import('./views/Countdown.vue')

const routes = [
    { path: '/', redirect: '/items/HAUSAUFGABE' },
    { path: '/welcome', name: 'Auth', component: AuthPage, meta: { title: 'Anmeldung' } },
    { path: '/items/:type?', name: 'ItemsByType', component: Hausaufgaben, props: true, meta: { title: 'Hausaufgaben' } },
    { path: '/bewerten', component: Home, meta: { title: 'Bewertungen' } },
    { path: '/person/:id', component: PersonDetail, props: true, meta: { title: 'Person' } },
    { path: '/admin', component: Admin, meta: { title: 'Admin Bereich' } },
    { path: '/hausaufgaben/verify', redirect: '/verify' },
    { path: '/verify', component: VerifyEmail, meta: { title: 'E-Mail Verifizierung' } },
    { path: '/kuerzel', component: Kuerzel, meta: { title: 'Kürzel-Finder' } },
    { path: '/kanye', component: Ye, meta: { title: 'Kanye' } },
    { path: '/ai-detector', component: Aidetector, meta: { title: 'AI Detektor' } },
    { path: '/sorgenbox', component: BS, meta: { title: 'Sorgenbox' } },
    { path: '/kontakt', component: Kontakt, meta: { title: 'Kontakt' } },
    { path: '/spiele', component: Games, meta: { title: 'Spiel Übersicht' } },
    { path: '/stundenplan', component: Finales, meta: { title: 'Stundenplan' } },
    { path: '/countdown', component: Countdown, meta: { title: 'Countdown' } },
    //{ path: '/news', component: News, meta: { title: 'News' } },
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
    scrollBehavior(to, from, savedPosition) {
        return { top: 0 };
    }
});

const { isAuthenticated, isAuthReady, initAuth } = useAuth();
router.beforeEach((to, from, next) => {
    if (to.meta.title) {
        document.title = to.meta.title + ' | Dashboard';
    } else {
        document.title = 'Dashboard';
    }
    next();
});

router.beforeEach(async (to, from, next) => {
    if (to.path === '/welcome') return next();

    if (!isAuthReady.value) {
        await initAuth();
    }

    if (!isAuthenticated.value) {
        return next({ path: '/welcome' });
    }

    return next();
});

export default router;