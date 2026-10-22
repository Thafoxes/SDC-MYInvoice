import { createApp, h } from 'vue';
import App from './App.vue';
import DemoAccess from './components/DemoAccess.vue';
import router from './router';
import './index.css';
import { connectionError } from './services/commands';
const app = createApp({
  render: () => h(DemoAccess, null, { default: () => h(App) }),
});
app.config.errorHandler = (error) => { connectionError.value = error instanceof Error ? error.message : 'Operation failed'; };
app.use(router).mount('#app');
