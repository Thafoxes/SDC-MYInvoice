<script setup lang="ts">
import { computed, ref } from 'vue';
import { Bell, ChevronDown, UserCheck } from 'lucide-vue-next';
import { useRouter, useRoute } from 'vue-router';
import type { Notification } from '@/types';
import { formatDateTime } from '@/lib/format';
import { markNotificationReadById } from '@/lib/store';
import { useDemoStore } from '@/composables/useDemoStore';
import { useCurrentUser } from '@/composables/useCurrentUser';

const props = defineProps<{
  notifications: Notification[];
  simulatedDate: string;
}>();

const { refreshStore } = useDemoStore();
const { currentUser, currentBusiness, setCurrentUser } = useCurrentUser();
const route = useRoute();
const router = useRouter();

const showNotifs = ref(false);
const showProfile = ref(false);

const unreadCount = computed(() => props.notifications.filter(n => !n.read).length);
const formattedDate = computed(() => new Date(props.simulatedDate + 'T12:00:00').toLocaleDateString('en-MY', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Kuala_Lumpur',
}));

function openNotification(n: Notification) {
  markNotificationReadById(n.id);
  refreshStore();
  showNotifs.value = false;
  if (n.link === 'action-center') router.push('/action-center');
}

function onUserChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  setCurrentUser(target.value);
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-orbyte-border bg-white/85 backdrop-blur-md">
    <div class="flex flex-col gap-3 px-6 py-3.5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <div class="pl-10 lg:pl-0">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-xl font-bold">{{ route.meta.title }}</h2>
          <span class="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">DEMO MODE</span>
          <span class="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">Simulated Orbyte data</span>
        </div>
        <p class="text-sm text-orbyte-muted mt-0.5">{{ route.meta.subtitle }}</p>
        <p class="text-xs text-orbyte-muted mt-0.5">{{ formattedDate }} · {{ currentBusiness?.name || 'Business' }}</p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <!-- Simulated login switcher -->
        <div class="flex items-center gap-1.5 rounded-xl border border-orbyte-border bg-orbyte-bg/40 px-2.5 py-1.5 text-xs">
          <UserCheck class="w-3.5 h-3.5 text-orbyte-muted shrink-0" />
          <span class="text-orbyte-muted text-[11px] whitespace-nowrap hidden sm:inline">Viewing as (simulated login):</span>
          <select
            :value="currentUser.id"
            @change="onUserChange"
            class="rounded-lg border border-orbyte-border bg-white px-2 py-1 text-xs font-medium text-orbyte-ink shadow-sm focus:outline-none focus:ring-1 focus:ring-orbyte-button"
            aria-label="Viewing as (simulated login)"
          >
            <option value="user-seller">Siti Aishah (Seller, Kedai Maju Jaya)</option>
            <option value="user-staff">Tan Wei Long (Staff, Kedai Maju Jaya)</option>
            <option value="user-seller2">Rajesh Kumar (Seller, Delta Niaga)</option>
          </select>
        </div>

        <!-- Notifications -->
        <div class="relative">
          <button
            aria-label="Notifications"
            class="relative rounded-xl p-2 text-orbyte-muted hover:bg-orbyte-bg"
            @click="showNotifs = !showNotifs; showProfile = false"
          >
            <Bell class="w-5 h-5" />
            <span v-if="unreadCount" class="absolute -right-1 -top-1 rounded-full bg-orbyte-overdue px-1.5 text-[10px] text-white">{{ unreadCount }}</span>
          </button>
          <div v-if="showNotifs" class="absolute right-0 mt-2 w-80 max-w-[85vw] rounded-xl bg-white shadow-xl border border-orbyte-border overflow-hidden z-40">
            <p class="px-4 py-3 border-b border-orbyte-border text-sm font-semibold">Notifications</p>
            <div class="max-h-80 overflow-y-auto">
              <button
                v-for="n in notifications"
                :key="n.id"
                @click="openNotification(n)"
                class="w-full px-4 py-3 text-left border-b border-orbyte-border hover:bg-orbyte-bg"
                :class="!n.read ? 'bg-blue-50/40' : ''"
              >
                <p class="text-sm font-medium">{{ n.title }} <span v-if="!n.read" class="text-orbyte-blue">•</span></p>
                <p class="text-xs text-orbyte-muted">{{ n.body }}</p>
                <p class="text-[10px] text-orbyte-muted mt-1">{{ formatDateTime(n.created_at) }}</p>
              </button>
              <p v-if="!notifications.length" class="p-5 text-center text-sm text-orbyte-muted">No notifications</p>
            </div>
          </div>
        </div>

        <!-- User profile preview -->
        <div class="relative">
          <button
            @click="showProfile = !showProfile; showNotifs = false"
            class="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-orbyte-bg"
          >
            <div
              class="flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-semibold"
              :style="{ backgroundColor: currentUser.avatar_color }"
            >
              {{ currentUser.name.charAt(0) }}
            </div>
            <span class="hidden sm:block text-left">
              <p class="text-sm font-medium leading-none">{{ currentUser.name }}</p>
              <p class="text-[10px] text-orbyte-muted mt-1 capitalize">{{ currentUser.role }} · {{ currentBusiness?.name }}</p>
            </span>
            <ChevronDown class="hidden sm:block w-4 h-4 text-orbyte-muted" />
          </button>
          <div v-if="showProfile" class="absolute right-0 mt-2 w-64 rounded-xl border border-orbyte-border bg-white shadow-xl p-4 z-40 space-y-1">
            <p class="text-sm font-semibold">{{ currentUser.name }}</p>
            <p class="text-xs text-orbyte-muted">{{ currentUser.email }}</p>
            <p class="text-xs text-orbyte-muted capitalize">{{ currentUser.role }} account (simulated)</p>
            <div class="pt-2 border-t border-orbyte-border text-xs text-orbyte-muted">
              Business: <strong>{{ currentBusiness?.name }}</strong> ({{ currentBusiness?.id }})
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
