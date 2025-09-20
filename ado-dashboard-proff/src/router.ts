import { createRouter, createWebHistory } from 'vue-router';
import Home from './views/Home.vue';
import PersonDetail from './views/PersonDetail.vue';
import Admin from './views/Admin.vue';
import Hausaufgaben from './views/Hausaufgaben.vue';
import VerifyEmail from './views/VerifyEmail.vue';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: Home },
        { path: '/person/:id', component: PersonDetail, props: true },
        { path: '/admin', component: Admin },
        { path: '/hausaufgaben', component: Hausaufgaben },
        { path: '/hausaufgaben/verify', component: VerifyEmail }
    ]
});
export default router;
