import { ref, computed } from 'vue';
import { useDemoStore } from './useDemoStore';
import type { User, Business } from '@/types';

const STORAGE_KEY = 'nudgewise_current_user_id';
const selectedUserId = ref<string>(localStorage.getItem(STORAGE_KEY) || 'user-seller');

export function useCurrentUser() {
  const { data, refreshStore } = useDemoStore();

  const availableUsers = computed<User[]>(() => {
    return data.value.users;
  });

  const currentUser = computed<User>(() => {
    const found = data.value.users.find(u => u.id === selectedUserId.value);
    if (found) return found;
    return data.value.users[0] || {
      id: 'user-seller',
      business_id: 'biz-001',
      name: 'Siti Aishah',
      email: 'siti@majujaya.my',
      role: 'seller',
      avatar_color: '#1D72E0',
    };
  });

  const currentBusiness = computed<Business | undefined>(() => {
    return data.value.businesses.find(b => b.id === currentUser.value.business_id);
  });

  function setCurrentUser(userId: string) {
    selectedUserId.value = userId;
    try {
      localStorage.setItem(STORAGE_KEY, userId);
    } catch { /* ignore */ }
    refreshStore();
  }

  const isSeller = computed(() => currentUser.value.role === 'seller');
  const isStaff = computed(() => currentUser.value.role === 'staff');

  return {
    currentUser,
    currentBusiness,
    availableUsers,
    selectedUserId,
    setCurrentUser,
    isSeller,
    isStaff,
  };
}
