import { createRouter, createWebHistory } from 'vue-router';
import Hausaufgaben from './views/Hausaufgaben.vue';
import { useAuth } from './composables/useAuth';

const PersonDetail = () => import('./views/PersonDetail.vue');
const Admin = () => import('./views/Admin.vue');
const Home = () => import('./views/Home.vue');
const VerifyEmail = () => import('./views/VerifyEmail.vue');
const Stundenplan = () => import('./views/Stundenplan.vue');
const Kuerzel = () => import('./views/Kuerzel.vue');
const LokaleToDoListe = () => import('./views/LokaleToDoListe.vue');
const Ye = () => import('./views/Ye.vue');
const BS = () => import('./views/BS.vue');
const Kontakt = () => import('./components/ContactForm.vue');
const AuthPage = () => import('./views/AuthPage.vue');
const Aidetector = () => import('./views/aiDetector.vue')
const Games = () => import('./views/Games.vue')
const GameDetail = () => import('./views/GameDetail.vue')
//const Chatter = () => import('./views/TestChat.vue')
//const News = () => import('./views/News.vue')

const routes = [
    { path: '/', redirect: '/items/HAUSAUFGABE' },
    { path: '/welcome', name: 'Auth', component: AuthPage },
    { path: '/items/:type?', name: 'ItemsByType', component: Hausaufgaben, props: true },
    { path: '/bewerten', component: Home },
    { path: '/person/:id', component: PersonDetail, props: true },
    { path: '/admin', component: Admin },
    { path: '/hausaufgaben/verify', redirect: '/verify' },
    { path: '/verify', component: VerifyEmail },
    { path: '/stundenplan', component: Stundenplan },
    { path: '/kuerzel', component: Kuerzel },
    { path: '/lokale-to-do-liste', component: LokaleToDoListe },
    { path: '/kanye', component: Ye },
    { path: '/ai-detector', component: Aidetector },
    { path: '/fresser', component: BS },
    { path: '/kontakt', component: Kontakt },
    { path: '/8912', component: Games },
    //{ path: '/news', component: News },
    {
        path: '/8912/:id',
        name: 'GameDetail',
        component: GameDetail,
        props: true
    },
    { path: '/goat', redirect: '/kanye' },
    //{ path: '/chatter', component: Chatter },


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

router.beforeEach(async (to, from, next) => {
    const auth = useAuth();

    // 1. Definition der öffentlichen Pfade
    const publicPaths = [
        '/welcome',
        '/impressum-&-datenschutz',
        '/impressum-&-datenschutz/impressum',
        '/impressum-&-datenschutz/datenschutzerklaerung',
        '/' // Die Weiterleitung der Wurzel (redirect: '/items/HAUSAUFGABE') wird hier gehandhabt.
    ];

    // Prüft, ob eine Authentifizierung erforderlich ist.
    const authRequired = !publicPaths.some(path => to.path === path || to.path.startsWith(path + '/'));

    if (authRequired) {

        // 2. Status vom Server prüfen, falls unbekannt (null)
        if (auth.isAuthenticated.value === null) {
            // Warten, bis der Server den Status bestätigt
            await auth.checkAuthStatus();
        }

        // 3. Ist der Benutzer nicht angemeldet?
        if (!auth.isAuthenticated.value) {
            // Weiterleitung zur Login-Seite
            return next({ name: 'Auth', query: { redirect: to.fullPath } });
        }
    }

    // 4. Authentifiziert oder öffentliche Seite: Erlauben
    next();
});

export default router;
