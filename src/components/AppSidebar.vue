<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { LayoutDashboard, Zap, Sparkles, ChevronsUpDown, X, FileText, Users } from 'lucide-vue-next';
import { useCurrentUser } from '@/composables/useCurrentUser';

const props = defineProps<{ mobileOpen?: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { currentUser, currentBusiness, setCurrentUser } = useCurrentUser();
const route = useRoute();

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/action-center', label: 'Action Center', icon: Zap },
  { to: '/ai-assistant', label: 'AI Assistant', icon: Sparkles },
];

function onWorkspaceChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  setCurrentUser(target.value);
}
</script>

<template>
  <!-- Mobile backdrop -->
  <div
    v-if="mobileOpen"
    class="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden"
    @click="emit('close')"
  ></div>

  <!-- Sidebar Container -->
  <aside
    class="fixed left-0 top-0 z-40 h-full w-[240px] flex flex-col border-r border-slate-200 bg-white transition-transform duration-200"
    :class="mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
  >
    <!-- Wordmark header -->
    <div class="flex items-center justify-between px-5 h-16">
      <div class="flex items-center gap-2">
        <span class="text-lg font-bold tracking-tight text-slate-900">NudgeWise</span>
      </div>
      <button
        type="button"
        class="lg:hidden p-1 text-slate-400 hover:text-slate-600 rounded"
        aria-label="Close navigation"
        @click="emit('close')"
      >
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Workspace selector (business + simulated login) -->
    <div class="px-3 pb-3 border-b border-slate-100">
      <div class="relative rounded-lg border border-slate-200 bg-slate-50/80 p-2 hover:bg-slate-100/70 transition">
        <div class="flex items-center justify-between pointer-events-none">
          <div class="min-w-0 flex-1">
            <p class="text-[13px] font-semibold text-slate-900 truncate leading-tight">{{ currentBusiness?.name }}</p>
            <p class="text-[13px] text-slate-500 truncate mt-0.5">{{ currentUser.name }} ({{ currentUser.role }})</p>
          </div>
          <ChevronsUpDown class="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
        </div>
        <select
          :value="currentUser.id"
          @change="onWorkspaceChange"
          class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label="Select workspace and user"
        >
          <option value="user-seller">Kedai Maju Jaya — Siti Aishah (Seller)</option>
          <option value="user-staff">Kedai Maju Jaya — Tan Wei Long (Staff)</option>
          <option value="user-seller2">Delta Niaga — Rajesh Kumar (Seller)</option>
        </select>
      </div>
    </div>

    <!-- Navigation links -->
    <nav class="flex-1 px-3 py-3 space-y-1">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        @click="emit('close')"
        class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition"
        :class="route.path === link.to ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
      >
        <component
          :is="link.icon"
          class="w-[18px] h-[18px]"
          :class="route.path === link.to ? 'text-blue-700' : 'text-slate-400'"
        />
        {{ link.label }}
      </RouterLink>
    </nav>
  </aside>
</template>
