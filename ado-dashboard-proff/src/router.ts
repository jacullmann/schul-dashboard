import { createRouter, createWebHistory } from 'vue-router';
import Hausaufgaben from './views/Hausaufgaben.vue';
import { useAppAuth } from './composables/useAppAuth';
import { useLoadingBar } from './composables/loadingState';
import { useUserStore } from './stores/userStore';

const VerifyEmail = () => import('./views/VerifyEmail.vue');
const Kuerzel = () => import('./views/tools/Kuerzel.vue');
const Ye = () => import('./views/kanye/Ye.vue');
const BS = () => import('./views/BS.vue');
const Kontakt = () => import('./components/ContactForm.vue');
const AuthPage = () => import('./views/AuthPage.vue');
const Aidetector = () => import('./views/aiDetector.vue');
const Games = () => import('./views/Games.vue');
const GameDetail = () => import('./views/GameDetail.vue');
const Finales = () => import('./components/Finaleb.vue');
const Countdown = () => import('./views/Countdown.vue');
const AdminDashboard = () => import('./views/AdminDashboard.vue');
const DaltonFinder = () => import('./views/tools/DaltonFinder.vue');
const Devide = () => import('./views/devider/Devide.vue');
const PatchInfo = () => import('./views/updates/Info.vue');

const routes = [
    { path: '/', redirect: '/items/HAUSAUFGABE' },
    {
        path: '/welcome',
        name: 'Auth',
        component: AuthPage,
        meta: {
            title: 'Anmeldung',
            fullWidth: true,
            hideNavigation: true
        }
    },
    {
        path: '/items/:type?',
        name: 'ItemsByType',
        component: Hausaufgaben,
        props: true,
        meta: {
            title: 'Hausaufgaben',
            fullWidth: false,
            hideNavigation: false
        }
    },

    {
        path: '/admin-dashboard',
        name: 'AdminDashboard',
        component: AdminDashboard,
        meta: {
            title: 'Admin Dashboard',
            requiresAdmin: true,
            fullWidth: true,
            hideNavigation: true
        }
    },
    {
        path: '/divide',
        component: Devide,
        meta: {
            title: 'Devided',
            fullWidth: true,
            hideNavigation: false
        }
    },

    {
        path: '/hausaufgaben/verify',
        redirect: '/verify'
    },
    {
        path: '/verify',
        component: VerifyEmail,
        meta: {
            title: 'E-Mail Verifizierung',
            fullWidth: false,
            hideNavigation: true
        }
    },
    {
        path: '/kuerzel',
        component: Kuerzel,
        meta: {
            title: 'Kürzelfinder',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/kanye',
        component: Ye,
        meta: {
            title: 'Kanye',
            fullWidth: true,
            hideNavigation: true
        },
        children: [
            {
                path: 'graduation',
                component: () => import('./views/kanye/routes/Graduation.vue'),
                meta: {
                    title: 'Graduation',
                    fullWidth: true,
                    hideNavigation: true
                }
            },
            {
                path: 'late-registration',
                component: () => import('./views/kanye/routes/LateRegistration.vue'),
                meta: {
                    title: 'Late Registration',
                    fullWidth: true,
                    hideNavigation: true
                }
            },
            {
                path: 'twisted-fantasy',
                component: () => import('./views/kanye/routes/TwistedFantasy.vue'),
                meta: {
                    title: 'Twisted Fantasy',
                    fullWidth: true,
                    hideNavigation: true
                }
            },
            {
                path: 'ye',
                component: () => import('./views/kanye/routes/Ye.vue'),
                meta: {
                    title: 'Ye',
                    fullWidth: true,
                    hideNavigation: true
                }
            },
            {
                path: 'yeezus',
                component: () => import('./views/kanye/routes/Yeezus.vue'),
                meta: {
                    title: 'Yeezus',
                    fullWidth: true,
                    hideNavigation: true
                }
            }
        ]
    },
    {
        path: '/ai-detector',
        component: Aidetector,
        meta: {
            title: 'AI Detektor',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/sorgenbox',
        component: BS,
        meta: {
            title: 'Sorgenbox',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/kontakt',
        component: Kontakt,
        meta: {
            title: 'Kontakt',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
      path: '/update-history',
      component: PatchInfo,
      meta: {
          title: 'Update Hostory',
          fullWidth: true,
          hideNavigation: false
      }
    },
    {
        path: '/spiele',
        component: Games,
        meta: {
            title: 'Spiel Übersicht',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/stundenplan',
        component: Finales,
        meta: {
            title: 'Stundenplan',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/daltonraumfinder',
        component: DaltonFinder,
        meta: {
            title: 'Daltonraumfinder',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/countdown',
        component: Countdown,
        meta: {
            title: 'Countdown',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/spiele/:id',
        name: 'GameDetail',
        component: GameDetail,
        props: true,
        meta: {
            title: 'Spiel',
            fullWidth: false,
            hideNavigation: false
        }
    },
    { path: '/goat', redirect: '/kanye' },

    {
        path: '/impressum-&-datenschutz',
        component: () => import('./views/legal/LegalLayout.vue'),
        children: [
            { path: 'impressum',
                component: () => import('./views/legal/ImpressumPage.vue'),
                meta: {
                title: 'Impressum',
                fullWidth: false,
                hideNavigation: false
            }
            },
            {
                path: 'datenschutz',
                component: () => import('./views/legal/DatenschutzPage.vue'),
                meta: {
                    title: 'Datenschutzerklärung',
                    fullWidth: false,
                    hideNavigation: false
                }
            },
            {
                path: 'nutzung',
                component: () => import('./views/legal/Nutzungsbedingungen.vue'),
                meta: {
                    title: 'Nutzungsbedingungen',
                    fullWidth: false,
                    hideNavigation: false
                }
            }

        ]
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('./views/NotFound.vue'),
        meta: {
            title: '404',
            fullWidth: true,
            hideNavigation: false
        }
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

const { start, finish } = useLoadingBar();
const { isAuthenticated, isAuthReady, initAuth } = useAppAuth();

router.beforeEach(async (to, from, next) => {
    if (to.path !== from.path) start();

    if (!isAuthReady.value) {
        await initAuth();
    }

    const publicPaths = ['/welcome', '/verify'];
    const isPublicRoute = publicPaths.includes(to.path);
    if (!isPublicRoute && !isAuthenticated.value) {
        finish();
        return next({ path: '/welcome', replace: true });
    }
    if (to.path === '/welcome' && isAuthenticated.value) {
        finish();
        return next({ path: '/items/HAUSAUFGABE', replace: true });
    }

    if (to.meta.title) {
        document.title = to.meta.title + ' | Dashboard';
    } else {
        document.title = 'Dashboard';
    }

    const userStore = useUserStore();

    if (isAuthenticated.value && !isPublicRoute) {
        if (!userStore.initialized && !userStore.loading) {
            await userStore.fetchUser();
        }
    }

    if (to.meta.requiresAdmin) {
        if (!userStore.initialized) {
            await userStore.fetchUser();
        }

        if (!userStore.isAdmin) {
            console.warn('Zugriff verweigert: Kein Admin');
            finish();
            return next({ path: '/items/HAUSAUFGABE', replace: true });
        }
    }

    next();
});

router.afterEach(() => {
    finish();
});

export default router;