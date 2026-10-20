import { ref, computed } from 'vue';
import { getStore } from '@/lib/store';
// Small application-wide reactive invalidation signal for the existing
// TypeScript/localStorage business modules. Later this can be replaced with an API store.
const revision = ref(0);
export function refreshStore() { revision.value += 1; }
export function useDemoStore() {
  const data = computed(() => { void revision.value; return getStore(); });
  return { data, refreshStore, revision };
}
