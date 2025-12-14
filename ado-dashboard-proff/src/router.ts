import { createRouter, createWebHistory } from 'vue-router';
import Hausaufgaben from './views/Hausaufgaben.vue';
import { useAuth } from './composables/useAuth';
import { useLoadingBar } from './composables/loadingState';
import hw from './hwApi';

const VerifyEmail = () => import('./views/VerifyEmail.vue');
const Kuerzel = () => import('./views/tools/Kuerzel.vue');
const Ye = () => import('./views/kanye/Ye.vue');
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
const Devide = () => import('./views/devider/Devide.vue')
const PatchInfo = () => import('./views/updates/Info.vue')

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
                path: 'agb',
                component: () => import('./views/legal/AGB.vue'),
                meta: {
                    title: 'AGB',
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
const { isAuthenticated, isAuthReady, initAuth } = useAuth();

router.beforeEach(async (to, from, next) => {
    // 1. Loading Bar starten
    if (to.path !== from.path) start();

    // 2. Auth initialisieren falls nötig
    if (!isAuthReady.value) {
        await initAuth();
    }

    // 3. Globaler Auth Check
    const publicPaths = ['/welcome', '/verify'];
    if (!publicPaths.includes(to.path) && !isAuthenticated.value) {
        finish();
        return next({ path: '/welcome' });
    }

    // 4. Titel setzen
    if (to.meta.title) {
        document.title = to.meta.title + ' | Dashboard';
    } else {
        document.title = 'Dashboard';
    }

    if (to.meta.requiresAdmin) {
        try {
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