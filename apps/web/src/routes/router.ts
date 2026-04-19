import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'
import { AdminContentPage } from '../pages/admin/AdminContentPage'
import { AdminLoginPage } from '../pages/admin/AdminLoginPage'
import { AdminOverviewPage } from '../pages/admin/AdminOverviewPage'
import { AdminQueuePage } from '../pages/admin/AdminQueuePage'
import { AdminUsersPage } from '../pages/admin/AdminUsersPage'
import { DashboardPage } from '../pages/DashboardPage'
import { LearnPage } from '../pages/LearnPage'
import { LoginPage } from '../pages/LoginPage'
import { PracticePage } from '../pages/PracticePage'
import { ProgressPage } from '../pages/ProgressPage'
import { RegisterPage } from '../pages/RegisterPage'
import { ReviewPage } from '../pages/ReviewPage'
import { RoadmapPage } from '../pages/RoadmapPage'
import { StagePage } from '../pages/StagePage'
import { useAdminStore } from '../stores/admin.store'
import { useAuthStore } from '../stores/auth.store'

// Root route
const rootRoute = createRootRoute()

// Auth guard helper
function requireAuth() {
  const { isAuthenticated } = useAuthStore.getState()
  if (!isAuthenticated) {
    throw redirect({ to: '/login' })
  }
}

function requireGuest() {
  const { isAuthenticated } = useAuthStore.getState()
  if (isAuthenticated) {
    throw redirect({ to: '/dashboard' })
  }
}

function requireAdmin() {
  const { isAuthenticated } = useAdminStore.getState()
  if (!isAuthenticated) {
    throw redirect({ to: '/admin/login' })
  }
}

function requireAdminGuest() {
  const { isAuthenticated } = useAdminStore.getState()
  if (isAuthenticated) {
    throw redirect({ to: '/admin' })
  }
}

// Routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState()
    throw redirect({ to: isAuthenticated ? '/dashboard' : '/login' })
  },
  component: () => null,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: requireGuest,
  component: LoginPage,
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  beforeLoad: requireGuest,
  component: RegisterPage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: requireAuth,
  component: DashboardPage,
})

const reviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/review',
  beforeLoad: requireAuth,
  component: ReviewPage,
})

const learnRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/learn/$lessonId',
  beforeLoad: requireAuth,
  component: LearnPage,
})

const progressRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/progress',
  beforeLoad: requireAuth,
  component: ProgressPage,
})

const practiceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/practice',
  beforeLoad: requireAuth,
  component: PracticePage,
})

const roadmapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/roadmap',
  beforeLoad: requireAuth,
  component: RoadmapPage,
})

const stageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/stages/$stageId',
  beforeLoad: requireAuth,
  component: StagePage,
})

const adminLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/login',
  beforeLoad: requireAdminGuest,
  component: AdminLoginPage,
})

const adminOverviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  beforeLoad: requireAdmin,
  component: AdminOverviewPage,
})

const adminUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/users',
  beforeLoad: requireAdmin,
  component: AdminUsersPage,
})

const adminQueueRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/queue',
  beforeLoad: requireAdmin,
  component: AdminQueuePage,
})

const adminContentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/content',
  beforeLoad: requireAdmin,
  component: AdminContentPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  dashboardRoute,
  reviewRoute,
  learnRoute,
  progressRoute,
  practiceRoute,
  roadmapRoute,
  stageRoute,
  adminLoginRoute,
  adminOverviewRoute,
  adminUsersRoute,
  adminQueueRoute,
  adminContentRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
