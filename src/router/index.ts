import { createRouter, createWebHashHistory } from 'vue-router';
import DashboardView from '@/views/DashboardView.vue';
import ActionCenterView from '@/views/ActionCenterView.vue';
import AiAssistantView from '@/views/AiAssistantView.vue';
import InvoicesView from '@/views/InvoicesView.vue';
import CustomersView from '@/views/CustomersView.vue';
import OrdersView from '@/views/OrdersView.vue';
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/invoices', name: 'invoices', component: InvoicesView, meta: { title: 'Invoices', subtitle: 'Search invoices and review balances, payments and follow-ups.' } },
    { path: '/customers', name: 'customers', component: CustomersView, meta: { title: 'Customers', subtitle: 'Review customer payment history and follow-up priorities.' } },
    { path: '/orders', name: 'orders', component: OrdersView, meta: { title: 'Purchase orders', subtitle: 'Check customer eligibility and approve incoming buyer orders.' } },
    { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { title: 'Dashboard', subtitle: "Here's your invoice collection overview." } },
    { path: '/action-center', name: 'action-center', component: ActionCenterView, meta: { title: 'Action Center', subtitle: 'Review reminders, customer responses, and invoice issues requiring your attention.' } },
    { path: '/ai-assistant', name: 'ai-assistant', component: AiAssistantView, meta: { title: 'AI Invoice Assistant', subtitle: 'Ask questions about invoices and payment follow-ups.' } },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
});
export default router;
