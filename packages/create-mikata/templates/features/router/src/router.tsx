import { createRouter, defineRoutes } from 'mikata';
import { Home } from './pages/Home';
import { About } from './pages/About';

const routes = defineRoutes([
  { path: '/', component: Home },
  { path: '/about', component: About },
]);

export const router = createRouter({ routes, history: 'browser' });
