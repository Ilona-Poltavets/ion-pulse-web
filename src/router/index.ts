import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import AuthView from '@/views/AuthView.vue'
import ProfileView from '@/views/ProfileView.vue'
import AdminApplicationsView from '@/views/AdminApplicationsView.vue'
import WriteView from '@/views/WriteView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    { path: '/login', name: 'login', component: AuthView, props: { mode: 'login' } },
    { path: '/register', name: 'register', component: AuthView, props: { mode: 'register' } },
    { path: '/profile', name: 'profile', component: ProfileView },
    {
      path: '/admin/author-applications',
      name: 'admin-author-applications',
      component: AdminApplicationsView,
    },
    { path: '/write', name: 'write', component: WriteView },
  ],
})

export default router
