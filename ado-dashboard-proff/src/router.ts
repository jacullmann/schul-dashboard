// src/router/index.ts

import { createRouter, createWebHistory } from 'vue-router';

// Statischer Import für die Home-Seite
import Home from './views/Home.vue';

// Dynamische Importe für die anderen Views (Lazy Loading)
const PersonDetail = () => import('./views/PersonDetail.vue');
const Admin = () => import('./views/Admin.vue');
const Hausaufgaben = () => import('./views/Hausaufgaben.vue');
const VerifyEmail = () => import('./views/VerifyEmail.vue');
const Impressum = () => import('./views/Impressum.vue')

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: Home },
        { path: '/person/:id', component: PersonDetail, props: true },
        { path: '/admin', component: Admin },
        { path: '/hausaufgaben', component: Hausaufgaben },
        { path: '/hausaufgaben/verify', component: VerifyEmail },
        { path: '/impressum-&-datenschutz', component: Impressum }
    ]
});

export default router;