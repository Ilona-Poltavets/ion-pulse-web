import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import AuthView from '@/views/AuthView.vue'
import ProfileView from '@/views/ProfileView.vue'
import AdminApplicationsView from '@/views/AdminApplicationsView.vue'
import WriteView from '@/views/WriteView.vue'
import EditorialQueueView from '@/views/EditorialQueueView.vue'
import PublicationView from '@/views/PublicationView.vue'
import ModerationReportsView from '@/views/ModerationReportsView.vue'
import LocalizationEditorView from '@/views/LocalizationEditorView.vue'
import CategoriesView from '@/views/CategoriesView.vue'
import JournalCandidatesView from '@/views/JournalCandidatesView.vue'
import JournalView from '@/views/JournalView.vue'
import PasswordResetView from '@/views/PasswordResetView.vue'
import SanctionAppealView from '@/views/SanctionAppealView.vue'
import AdminUsersView from '@/views/AdminUsersView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    { path: '/content/categories', name: 'categories-management', component: CategoriesView },
    { path: '/journal/candidates', name: 'journal-candidates', component: JournalCandidatesView },
    { path: '/journal/:id?', name: 'journal', component: JournalView },
    { path: '/login', name: 'login', component: AuthView, props: { mode: 'login' } },
    { path: '/register', name: 'register', component: AuthView, props: { mode: 'register' } },
    {
      path: '/password-reset',
      name: 'password-reset',
      component: PasswordResetView,
      props: { mode: 'request' },
    },
    {
      path: '/reset-password',
      name: 'password-reset-confirm',
      component: PasswordResetView,
      props: { mode: 'confirm' },
    },
    { path: '/sanction-appeal', name: 'sanction-appeal', component: SanctionAppealView },
    { path: '/admin/users', name: 'admin-users', component: AdminUsersView },
    { path: '/profile', name: 'profile', component: ProfileView },
    {
      path: '/admin/author-applications',
      name: 'admin-author-applications',
      component: AdminApplicationsView,
    },
    { path: '/write', name: 'write', component: WriteView },
    { path: '/write/:id', name: 'edit-draft', component: WriteView },
    { path: '/editorial-queue', name: 'editorial-queue', component: EditorialQueueView },
    { path: '/publications/:id', name: 'publication', component: PublicationView },
    {
      path: '/:locale(ru|en)/publications/:id',
      name: 'localized-publication',
      component: PublicationView,
    },
    { path: '/moderation/reports', name: 'moderation-reports', component: ModerationReportsView },
    {
      path: '/editorial/localizations/:id/:locale',
      name: 'edit-localization',
      component: LocalizationEditorView,
    },
  ],
})

export default router
