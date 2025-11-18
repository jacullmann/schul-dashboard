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
    { path: '/welcome', name: 'Auth', component: AuthPage },
    { path: '/items/:type?', name: 'ItemsByType', component: Hausaufgaben, props: true },
    { path: '/bewerten', component: Home },
    { path: '/person/:id', component: PersonDetail, props: true },
    { path: '/admin', component: Admin },
    { path: '/hausaufgaben/verify', redirect: '/verify' },
    { path: '/verify', component: VerifyEmail },
    { path: '/kuerzel', component: Kuerzel },
    { path: '/kanye', component: Ye },
    { path: '/ai-detector', component: Aidetector },
    { path: '/sorgenbox', component: BS },
    { path: '/kontakt', component: Kontakt },
    { path: '/8912', component: Games },
    { path: '/stundenplan', component: Finales },
    { path: '/countdown', component: Countdown },
    //{ path: '/news', component: News },
    {
        path: '/8912/:id',
        name: 'GameDetail',
        component: GameDetail,
        props: true
    },
    { path: '/goat', redirect: '/kanye' },


    {
        path: '/impressum-&-datenschutz',
        component: () => import('./views/legal/LegalLayout.vue'),
        children: [
            { path: 'impressum', component: () => import('./views/legal/ImpressumPage.vue') },
            { path: 'datenschutzerklaerung', component: () => import('./views/legal/DatenschutzPage.vue') }
        ]
    },
    { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('./views/NotFound.vue') }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
        return { top: 0 };
    }
});

const { isAuthenticated, isAuthReady, initAuth } = useAuth();

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