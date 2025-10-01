import { createRouter, createWebHistory } from 'vue-router';

const Hausaufgaben = () => import('../views/Hausaufgaben.vue'); // lazy loaded
const PersonDetail = () => import('../views/PersonDetail.vue');
const Admin = () => import('../views/Admin.vue');
const Home = () => import('../views/Home.vue');
const VerifyEmail = () => import('../views/VerifyEmail.vue');
const Stundenplan = () => import('../views/Stundenplan.vue');
const Kuerzel = () => import('../views/Kuerzel.vue');
const LokaleToDoListe = () => import('../views/LokaleToDoListe.vue');
const Ye = () => import('../views/Ye.vue');
const BS = () => import('../views/BS.vue');
const Kontakt = () => import('../components/ContactForm.vue');

const router = createRouter({
    history: createWebHistory(),
    routes: [
        // Root redirects to default list view
        { path: '/', redirect: '/items/HAUSAUFGABE' },

        // Hauptseite lazy geladen; unterstützt optional param type
        { path: '/items/:type?', name: 'ItemsByType', component: Hausaufgaben, props: true },

        { path: '/bewerten', component: Home },
        { path: '/person/:id', component: PersonDetail, props: true },
        { path: '/admin', component: Admin },
        { path: '/verify', component: VerifyEmail },
        { path: '/stundenplan', component: Stundenplan },
        { path: '/kuerzel', component: Kuerzel },
        { path: '/lokale-to-do-liste', component: LokaleToDoListe },
        { path: '/kanye', component: Ye },
        { path: '/fresser', component: BS },
        { path: '/kontakt', component: Kontakt },

        {
            path: '/impressum-&-datenschutz',
            component: () => import('../views/legal/LegalLayout.vue'),
            children: [
                { path: 'impressum', component: () => import('../views/legal/ImpressumPage.vue') },
                { path: 'datenschutzerklaerung', component: () => import('../views/legal/DatenschutzPage.vue') }
            ]
        },

        { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('../views/NotFound.vue') }
    ]
});

export default router;
