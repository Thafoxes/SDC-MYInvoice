// Data access is handled by store.ts (localStorage-based).
// This file is kept as a compatibility re-export.
export {
  getStore, getDemoState, setDemoDate, resetStore, computeInvoiceWithCustomer,
  computeStatus, addPayment, addActivity, addNotificationRecord,
  markNotificationReadById, updateInvoice, addFollowUpAction, updateFollowUp,
  addCustomerResponse, updateCustomerResponse, addAiMessage, clearAiConversation,
  DEMO_BUSINESS_ID, DEMO_SELLER_ID, DEMO_BUSINESS_NAME,
} from './store';
