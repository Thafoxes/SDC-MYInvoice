import { ref } from 'vue';

export type ToastKind = 'success' | 'error' | 'info';
export interface Toast { id: number; message: string; kind: ToastKind }

// One app-wide toast queue, rendered once by AppToast.vue in App.vue.
const toasts = ref<Toast[]>([]);
let nextId = 1;

export function useToast() {
  function dismiss(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }
  function show(message: string, kind: ToastKind = 'success', ms = 4000) {
    const id = nextId++;
    toasts.value = [...toasts.value.slice(-2), { id, message, kind }];
    setTimeout(() => dismiss(id), ms);
  }
  return {
    toasts,
    dismiss,
    success: (m: string) => show(m, 'success'),
    error: (m: string) => show(m, 'error', 5000),
    info: (m: string) => show(m, 'info'),
  };
}
