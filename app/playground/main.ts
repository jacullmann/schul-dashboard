// Installs the mock API before the app issues its first request.
import './mock';
import '@/main';
import { createApp } from 'vue';
import router from '@/router';
import SpacingPanel from './SpacingPanel.vue';

createApp(SpacingPanel, { router }).mount('#pg-panel');
