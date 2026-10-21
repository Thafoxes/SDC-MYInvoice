<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { LayoutDashboard, Zap, Sparkles, Menu, X } from 'lucide-vue-next';
const mobileOpen = ref(false);
const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/action-center', label: 'Action Center', icon: Zap },
  { to: '/ai-assistant', label: 'AI Assistant', icon: Sparkles },
];
</script>
<template>
  <button type="button" aria-label="Open navigation" class="fixed top-3 left-3 z-40 rounded-lg bg-white p-2 shadow-sm border border-orbyte-border lg:hidden" @click="mobileOpen=true"><Menu class="w-5 h-5" /></button>
  <div v-if="mobileOpen" class="fixed inset-0 z-40 bg-[#162A50]/30 lg:hidden" @click="mobileOpen=false"></div>
  <aside class="fixed left-0 top-0 z-40 h-full w-[240px] flex flex-col border-r border-orbyte-border bg-orbyte-sidebar transition-transform duration-200" :class="mobileOpen?'translate-x-0':'-translate-x-full lg:translate-x-0'">
    <div class="flex items-center justify-between px-5 pt-6 pb-4">
      <div class="flex items-center gap-2.5"><span class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orbyte-blue to-orbyte-button text-white"><Sparkles class="w-5 h-5" /></span>
        <div><h1 class="text-lg font-bold leading-none">Orbyte</h1><p class="text-[10px] text-orbyte-muted mt-1">Invoice Follow-Up Assistant</p></div></div>
      <button class="lg:hidden" aria-label="Close navigation" @click="mobileOpen=false"><X class="w-5 h-5" /></button>
    </div>
    <nav class="flex-1 px-3 py-4 space-y-1">
      <p class="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-orbyte-muted">Menu</p>
      <RouterLink v-for="link in links" :key="link.to" :to="link.to" @click="mobileOpen=false" class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all" :class="$route.path===link.to?'bg-orbyte-button text-white shadow-sm':'text-orbyte-ink hover:bg-orbyte-bg'">
        <component :is="link.icon" class="w-[18px] h-[18px]" :class="$route.path===link.to?'text-white':'text-orbyte-blue'" />{{link.label}}
      </RouterLink>
    </nav>

  </aside>
</template>
