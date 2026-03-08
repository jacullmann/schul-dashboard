import { createRouter, createWebHistory } from 'vue-router';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useLoadingBar } from '@/common/composables/loadingState';
import { useUserStore } from '@/stores/userStore';

const routes = [
    // ─── Default Layout (header + footer) ───────────────────────────
    {
        path: '/',
        component: () => import('@/layouts/DefaultLayout.vue'),
        children: [
            { path: '', redirect: '/home' },
            {
                path: 'home',
                name: 'home',
                component: () => import('@/core/pages/HomePage.vue'),
                meta: { title: 'Home' },
            },
            {
                path: 'groups/:groupId',
                children: [
                    { path: '', redirect: to => `/groups/${to.params.groupId}/items/HAUSAUFGABE` },
                    {
                        path: 'items/:type?/:itemId?',
                        name: 'group-items',
                        component: () => import('@/modules/tasks/pages/Hausaufgaben.vue'),
                        props: true,
                        meta: { title: 'Aufgaben', requiresTenant: true },
                    },
                    {
                        path: 'stundenplan',
                        name: 'group-stundenplan',
                        component: () => import('@/modules/schedule/pages/Stundenplan.vue'),
                        meta: { title: 'Stundenplan', requiresTenant: true },
                    },
                    {
                        path: 'admin',
                        name: 'group-admin',
                        component: () => import('@/modules/admin/pages/GroupAdminDashboard.vue'),
                        meta: { title: 'Gruppen-Verwaltung', requiresGroupAdmin: true },
                    },
                ],
            },
            // ─── Non-group pages ────────────────────────────────────
            {
                path: 'kuerzel',
                name: 'kürzelfinder',
                component: () => import('@/modules/tools/pages/KuerzelPage.vue'),
                meta: { title: 'Kürzelfinder' },
            },
            {
                path: 'ai-detector',
                name: 'ai-detector',
                component: () => import('@/modules/tools/pages/AiDetectorPage.vue'),
                meta: { title: 'AI Detektor', fullWidth: true },
            },
            {
                path: 'sorgenbox',
                name: 'sorgenbox',
                component: () => import('@/modules/sorgenbox/pages/Sorgenbox.vue'),
                meta: { title: 'Sorgenbox' },
            },
            {
                path: 'kontakt',
                name: 'contact',
                component: () => import('@/modules/support/pages/ContactInfo.vue'),
                meta: { title: 'Kontakt' },
            },
            {
                path: 'update-history',
                name: 'update-history',
                component: () => import('@/modules/patchinfo/pages/PatchInfo.vue'),
                meta: { title: 'Update History', fullWidth: true },
            },
            {
                path: 'spiele',
                name: 'games',
                component: () => import('@/modules/games/Games.vue'),
                meta: { title: 'Spiel Übersicht' },
            },
            {
                path: 'spiele/:id',
                name: 'GameDetail',
                component: () => import('@/modules/games/GameDetail.vue'),
                props: true,
                meta: { title: 'Spiel' },
            },
            {
                path: 'daltonraumfinder',
                name: 'daltonraumfinder',
                component: () => import('@/modules/tools/pages/DaltonFinderPage.vue'),
                meta: { title: 'Daltonraumfinder' },
            },
            {
                path: 'imagetool',
                name: 'imagetool',
                component: () => import('@/modules/tools/pages/ImageToolPage.vue'),
                meta: { title: 'Bildbearbeitung' },
            },
            {
                path: 'info-dashboard',
                name: 'info-dashboard',
                component: () => import('@/modules/infodashboard/pages/InfoDashboard.vue'),
                meta: { title: 'Info Dashboard', fullWidth: true },
            },
            {
                path: 'brain',
                name: 'brain-library',
                component: () => import('@/modules/brain/pages/BrainLibrary.vue'),
                meta: { title: 'Gehirntraining' },
            },
            {
                path: 'brain/:testId',
                name: 'brain-test',
                component: () => import('@/modules/brain/pages/BrainTest.vue'),
                meta: { title: 'Gehirntest' },
            },
            {
                path: 'impressum-&-datenschutz',
                name: 'impressum-und-datenschutz',
                component: () => import('@/modules/legal/pages/LegalPagesWrapper.vue'),
                children: [
                    { path: 'impressum', name: 'impressum', component: () => import('@/modules/legal/components/ImpressumPage.vue'), meta: { title: 'Impressum' } },
                    { path: 'datenschutz', name: 'datenschutz', component: () => import('@/modules/legal/components/DatenschutzPage.vue'), meta: { title: 'Datenschutz' } },
                    { path: 'nutzung', name: 'nutzung', component: () => import('@/modules/legal/components/Nutzungsbedingungen.vue'), meta: { title: 'Nutzungsbedingungen' } },
                ],
            },
        ],
    },

    // ─── Welcome Layout ─────────────────────────────────────────────
    {
        path: '/welcome',
        component: () => import('@/layouts/WelcomeLayout.vue'),
        meta: { title: 'Willkommen', fullWidth: true },
        children: [
            { path: '', name: 'welcome-home', component: () => import('@/modules/welcome/pages/WelcomeHomePage.vue'), meta: { title: 'Willkommen' } },
            { path: 'auth', name: 'welcome-auth', component: () => import('@/modules/welcome/pages/WelcomeAuthPage.vue'), meta: { title: 'Anmeldung' } },
            { path: 'legal', name: 'welcome-legal', component: () => import('@/modules/welcome/pages/WelcomeLegalPage.vue'), meta: { title: 'Rechtliches' } },
        ],
    },

    // ─── Super Admin Dashboard ──────────────────────────────────────
    {
        path: '/admin',
        name: 'super-admin',
        component: () => import('@/modules/admin/pages/SuperAdminDashboard.vue'),
        meta: { title: 'Super Admin', requiresSuperAdmin: true, fullWidth: true },
    },

    // ─── Verify Email ───────────────────────────────────────────────
    {
        path: '/verify',
        component: () => import('@/layouts/WelcomeLayout.vue'),
        children: [
            { path: '', name: 'verify-email', component: () => import('@/core/pages/VerifyEmail.vue'), meta: { title: 'E-Mail Verifizierung' } },
        ],
    },

    // ─── Legacy Redirects ───────────────────────────────────────────
    { path: '/get-started', redirect: '/home' },
    { path: '/admin-dashboard', redirect: '/admin' },
    { path: '/hausaufgaben/verify', redirect: '/verify' },
    { path: '/items/:type?/:itemId?', redirect: to => {
            // Old /items/HAUSAUFGABE → needs group context, redirect to /home
            return '/home';
        }},
    { path: '/stundenplan', redirect: '/home' },

    // ─── Kanye Easter Egg ───────────────────────────────────────────
    {
        path: '/kanye',
        name: 'kanye',
        component: () => import('@/layouts/KanyeLayout.vue'),
        meta: { title: 'Kanye', fullWidth: true },
        children: [
            { path: 'graduation', name: 'kanye-graduation', component: () => import('@/modules/kanye/pages/Graduation.vue'), meta: { title: 'Graduation', fullWidth: true } },
            { path: 'late-registration', name: 'kanye-late-registration', component: () => import('@/modules/kanye/pages/LateRegistration.vue'), meta: { title: 'Late Registration', fullWidth: true } },
            { path: 'twisted-fantasy', name: 'kanye-twisted-fantasy', component: () => import('@/modules/kanye/pages/TwistedFantasy.vue'), meta: { title: 'Twisted Fantasy', fullWidth: true } },
            { path: 'ye', name: 'kanye-ye', component: () => import('@/modules/kanye/pages/Ye.vue'), meta: { title: 'Ye', fullWidth: true } },
            { path: 'yeezus', name: 'kanye-yeezus', component: () => import('@/modules/kanye/pages/Yeezus.vue'), meta: { title: 'Yeezus', fullWidth: true } },
            { path: 'the-college-droupout', name: 'kanye-college-dropout', component: () => import('@/modules/kanye/pages/CollegeDropout.vue'), meta: { title: 'The College Dropout', fullWidth: true } },
            { path: '808s-and-heartbreak', name: 'kanye-808s-and-heartbreak', component: () => import('@/modules/kanye/pages/808sAndHeartbreak.vue'), meta: { title: '808s & Heartbreak', fullWidth: true } },
            { path: 'watch-the-throne', name: 'kanye-watch-the-throne', component: () => import('@/modules/kanye/pages/WatchTheThrone.vue'), meta: { title: 'Watch The Throne', fullWidth: true } },
            { path: 'life-of-pablo', name: 'kanye-life-of-pablo', component: () => import('@/modules/kanye/pages/LifeOfPablo.vue'), meta: { title: 'The Life Of Pablo', fullWidth: true } },
            { path: 'kids-see-ghosts', name: 'kanye-kids-see-ghosts', component: () => import('@/modules/kanye/pages/KidsSeeGhosts.vue'), meta: { title: 'KIDS SEE GHOSTS', fullWidth: true } },
            { path: 'jesus-is-king', name: 'kanye-jesus-is-king', component: () => import('@/modules/kanye/pages/JesusIsKing.vue'), meta: { title: 'Jesus Is King', fullWidth: true } },
            { path: 'donda', name: 'kanye-donda', component: () => import('@/modules/kanye/pages/Donda.vue'), meta: { title: 'Donda', fullWidth: true } },
        ],
    },
    { path: '/goat', redirect: '/kanye' },

    // ─── 404 ────────────────────────────────────────────────────────
    {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/core/pages/404-Page.vue'),
        meta: { title: '404', fullWidth: true },
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

const { start, finish } = useLoadingBar();
const { isAuthenticated, isAuthReady, initAuth, activeGroupId } = useAppAuth();

router.beforeEach(async (to, from, next) => {
    if (to.path !== from.path) start();

    if (!isAuthReady.value) await initAuth();

    const isPublicRoute = to.path.startsWith('/welcome') || to.path === '/verify';

    // Redirect unauthenticated users to welcome
    if (!isPublicRoute && !isAuthenticated.value) {
        // Allow pages that don't strictly need auth
        const allowedWithoutAuth = ['/kontakt', '/impressum'];
        const isAllowed = allowedWithoutAuth.some(p => to.path.startsWith(p));
        if (!isAllowed) {
            finish();
            return next({ path: '/welcome', replace: true });
        }
    }

    // Redirect authenticated users away from welcome
    if (to.path === '/welcome' && isAuthenticated.value) {
        finish();
        return next({ path: activeGroupId.value ? `/groups/${activeGroupId.value}/items/HAUSAUFGABE` : '/home', replace: true });
    }

    // Set document title
    if (to.meta.title) {
        document.title = to.meta.title + ' | Dashboard';
    } else {
        document.title = 'Dashboard';
    }

    // Ensure user store is initialized
    const userStore = useUserStore();
    if (isAuthenticated.value && !isPublicRoute && !userStore.initialized) {
        try { await userStore.fetchUser(); } catch {}
    }

    // Super admin guard
    if (to.meta.requiresSuperAdmin) {
        if (!userStore.initialized) await userStore.fetchUser();
        if (!userStore.isSuperadmin) {
            finish();
            return next({ path: '/home', replace: true });
        }
    }

    // Group admin guard
    if (to.meta.requiresGroupAdmin) {
        if (!userStore.initialized) await userStore.fetchUser();
        if (!userStore.isGroupAdmin && !userStore.isSuperadmin) {
            finish();
            return next({ path: '/home', replace: true });
        }
    }

    // Tenant-required routes: ensure there's an active group
    if (to.meta.requiresTenant && !activeGroupId.value) {
        finish();
        return next({ path: '/home', replace: true });
    }

    // When navigating to a group route, switch active group if needed
    if (to.params.groupId && to.params.groupId !== activeGroupId.value) {
        // The group switch will happen via the component or header
        // For now just allow navigation
    }

    next();
});

router.afterEach(() => finish());

export default router;