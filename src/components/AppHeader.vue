<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { Bell, Menu } from 'lucide-vue-next';
import { useRouter, useRoute } from 'vue-router';
import type { Notification } from '@/types';
import { formatDateTime } from '@/lib/format';
import { markNotificationReadById } from '@/lib/store';
import { useDemoStore } from '@/composables/useDemoStore';
import { useCurrentUser } from '@/composables/useCurrentUser';
import { useEscape } from '@/composables/useEscape';
import { formatActivityText } from '@/lib/display';

const props = defineProps<{
  notifications: Notification[];
  simulatedDate: string;
}>();

const emit = defineEmits<{ openMenu: [] }>();

const { data, refreshStore } = useDemoStore();
const { currentUser, currentBusiness } = useCurrentUser();
const route = useRoute();
const router = useRouter();

const showNotifs = ref(false);
const showProfile = ref(false);

const unreadCount = computed(() => props.notifications.filter(n => !n.read).length);
const formattedDate = computed(() => {
  const d = new Date(props.simulatedDate + 'T12:00:00');
  return d.toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kuala_Lumpur',
  });
});

function closeMenus() {
  showNotifs.value = false;
  showProfile.value = false;
}
useEscape(closeMenus);
onMounted(() => window.addEventListener('click', closeMenus));
onUnmounted(() => window.removeEventListener('click', closeMenus));

function openNotification(n: Notification) {
  markNotificationReadById(n.id);
  refreshStore();
  showNotifs.value = false;
  if (n.link === 'action-center') router.push('/action-center');
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
    <div class="flex items-center justify-between px-4 lg:px-8 h-16">
      <!-- Left: Mobile menu toggle + Page Title -->
      <div class="flex items-center gap-2 min-w-0">
        <button
          type="button"
          class="p-1 -ml-1 text-slate-500 hover:text-slate-900 rounded-lg lg:hidden"
          aria-label="Open navigation menu"
          @click="emit('openMenu')"
        >
          <Menu class="w-6 h-6" />
        </button>
        <h1 class="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 truncate">
          {{ route.meta.title }}
        </h1>
      </div>

      <!-- Right: Single-row metadata (Simulated data pill, date, bell, avatar) -->
      <div class="flex items-center gap-2 sm:gap-3 shrink-0">
        <span class="rounded-md px-2.5 py-1 text-[13px] font-medium bg-slate-100 text-slate-600 whitespace-nowrap">
          Simulated data
        </span>

        <span class="hidden sm:inline text-sm text-slate-600 tabular-nums whitespace-nowrap">
          {{ formattedDate }}
        </span>

        <!-- Notifications -->
        <div class="relative" @click.stop>
          <button
            type="button"
            aria-label="Notifications"
            :aria-expanded="showNotifs"
            class="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
            @click="showNotifs = !showNotifs; showProfile = false"
          >
            <Bell class="w-5 h-5" />
            <span
              v-if="unreadCount"
              class="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500"
            ></span>
          </button>

          <div
            v-if="showNotifs"
            class="absolute right-0 mt-2 w-80 max-w-[85vw] rounded-lg bg-white shadow-popover border border-slate-200 overflow-hidden z-40"
          >
            <div class="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-900">Notifications</span>
              <span v-if="unreadCount" class="text-[12px] text-slate-500 tabular-nums">{{ unreadCount }} unread</span>
            </div>
            <div class="max-h-72 overflow-y-auto divide-y divide-slate-100">
              <button
                v-for="n in notifications"
                :key="n.id"
                @click="openNotification(n)"
                class="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 transition"
                :class="!n.read ? 'bg-blue-50/30' : ''"
              >
                <p class="text-xs font-medium text-slate-900 flex items-center gap-1.5">
                  <span v-if="!n.read" class="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>
                  {{ n.title }}
                </p>
                <p class="text-[13px] text-slate-500 mt-0.5 leading-normal">{{ formatActivityText(n.body, data) }}</p>
                <p class="text-[12px] text-slate-400 mt-1 tabular-nums">{{ formatDateTime(n.created_at) }}</p>
              </button>
              <p v-if="!notifications.length" class="p-4 text-center text-xs text-slate-400">No notifications</p>
            </div>
          </div>
        </div>

        <!-- Profile / Avatar -->
        <div class="relative" @click.stop>
          <button
            type="button"
            :aria-expanded="showProfile"
            class="flex items-center rounded-full hover:ring-2 hover:ring-slate-200 transition"
            @click="showProfile = !showProfile; showNotifs = false"
            :aria-label="currentUser.name"
          >
            <div
              class="flex h-9 w-9 items-center justify-center rounded-full text-white text-sm font-semibold"
              :style="{ backgroundColor: currentUser.avatar_color }"
            >
              {{ currentUser.name.charAt(0) }}
            </div>
          </button>

          <div
            v-if="showProfile"
            class="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-popover p-3 z-40 text-xs space-y-1"
          >
            <p class="font-semibold text-slate-900">{{ currentUser.name }}</p>
            <p class="text-[13px] text-slate-500">{{ currentUser.email }}</p>
            <p class="text-[13px] text-slate-500 capitalize pt-1.5 border-t border-slate-100 mt-1.5">
              {{ currentUser.role }} account · {{ currentBusiness?.name }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
