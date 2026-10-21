<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { RouterView } from 'vue-router';
import AppSidebar from '@/components/AppSidebar.vue';
import AppHeader from '@/components/AppHeader.vue';
import DemoControls from '@/components/DemoControls.vue';
import { useDemoStore } from '@/composables/useDemoStore';
import { useCurrentUser } from '@/composables/useCurrentUser';

const { data, refreshStore } = useDemoStore();
const { currentUser } = useCurrentUser();

const notifications = computed(() => data.value.notifications.filter(n => n.business_id === currentUser.value.business_id));

const onStorage = () => refreshStore();
onMounted(() => window.addEventListener('storage', onStorage));
onUnmounted(() => window.removeEventListener('storage', onStorage));
</script>

<template>
  <div class="min-h-screen bg-orbyte-bg text-orbyte-ink">
    <AppSidebar />
    <div class="lg:pl-[240px]">
      <AppHeader
        :notifications="notifications"
        :simulated-date="data.demoState.simulated_date"
      />
      <main class="px-4 py-6 lg:px-8"><RouterView /></main>
    </div>
    <DemoControls :seller-name="currentUser.name" />
  </div>
</template>
