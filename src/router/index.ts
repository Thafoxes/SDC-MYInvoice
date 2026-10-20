import { createRouter, createWebHashHistory } from 'vue-router';
import DashboardView from '@/views/DashboardView.vue';
import ActionCenterView from '@/views/ActionCenterView.vue';
import AiAssistantView from '@/views/AiAssistantView.vue';
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { title: 'Dashboard', subtitle: "Here's your invoice collection overview." } },
    { path: '/action-center', name: 'action-center', component: ActionCenterView, meta: { title: 'Action Center', subtitle: 'Review reminders, customer responses, and invoice issues requiring your attention.' } },
    { path: '/ai-assistant', name: 'ai-assistant', component: AiAssistantView, meta: { title: 'AI Invoice Assistant', subtitle: 'Ask questions about invoices and payment follow-ups.' } },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
});
export default router;
