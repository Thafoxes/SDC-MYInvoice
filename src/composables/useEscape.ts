import { onMounted, onUnmounted } from 'vue';

/** Calls `handler` when Escape is pressed while the component is mounted. */
export function useEscape(handler: () => void) {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handler(); };
  onMounted(() => window.addEventListener('keydown', onKey));
  onUnmounted(() => window.removeEventListener('keydown', onKey));
}
