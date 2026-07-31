import { createRouter, createWebHistory } from 'vue-router'
import ClubRegistration from '../views/ClubRegistration.vue'
import Login from '../views/Login.vue'
import ClubPresidentRegistration from '../views/ClubPresidentRegistration.vue'
import StaffManagementDashboard from '../views/StaffManagementDashboard.vue'
import CategoryManagementDashboard from '../views/CategoryManagementDashboard.vue'
import SubscriptionDashboard from '../views/SubscriptionDashboard.vue'
import PaymentSuccess from '../views/PaymentSuccess.vue'
import PaymentFailure from '../views/PaymentFailure.vue'
import ComingSoon from '../views/ComingSoon.vue'
import { getAuthToken, getRefreshToken, refreshAuthToken, isAccessTokenExpired } from '../services/axiosConfig'

const routes = [
  {
    path: '/',
    redirect: '/club-registration'
  },
  {
    path: '/club-registration',
    name: 'ClubRegistration',
    component: ClubRegistration
  },
  {
    path: '/club-president-registration',
    name: 'ClubPresidentRegistration',
    component: ClubPresidentRegistration
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/dashboard/staff-management',
    name: 'StaffManagementDashboard',
    component: StaffManagementDashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard/home',
    name: 'HomeDashboard',
    component: () => import('../views/HomeDashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard/categories',
    name: 'CategoryManagementDashboard',
    component: CategoryManagementDashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard/players',
    name: 'PlayerAcquisition',
    component: () => import('../views/PlayerAcquisition.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard/matches',
    name: 'MatchesDashboard',
    component: () => import('../views/MatchesDashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard/schedule',
    name: 'ScheduleDashboard',
    component: () => import('../views/ScheduleDashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard/call-up',
    name: 'CallUpDashboard',
    component: () => import('../views/CallUpDashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard/match-monitor',
    name: 'MatchMonitorDashboard',
    component: () => import('../views/MatchMonitorDashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard/match-archive',
    name: 'MatchArchiveDashboard',
    component: () => import('../views/MatchArchiveDashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard/players-monitor',
    name: 'PlayersMonitorDashboard',
    component: ComingSoon,
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard/player-control',
    name: 'PlayerControlDashboard',
    component: () => import('../views/PlayerControlDashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard/training-monitor',
    name: 'TrainingMonitorDashboard',
    component: () => import('../views/TrainingMonitorDashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard/medical',
    name: 'MedicalDashboard',
    component: () => import('../views/MedicalDashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard/training',
    name: 'TrainingDashboard',
    component: () => import('../views/TrainingDashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard/training-archive',
    name: 'TrainingArchiveDashboard',
    component: () => import('../views/TrainingArchiveDashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard/subscription',
    name: 'SubscriptionDashboard',
    component: SubscriptionDashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard/finances',
    name: 'FinancesDashboard',
    component: ComingSoon,
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard/settings',
    name: 'SettingsDashboard',
    component: ComingSoon,
    meta: { requiresAuth: true }
  },
  {
    path: '/payment-success',
    name: 'PaymentSuccess',
    component: PaymentSuccess,
    alias: '/dashboard/payment-success'
  },
  {
    path: '/payment-failure',
    name: 'PaymentFailure',
    component: PaymentFailure
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

async function ensureSession() {
  const token = getAuthToken()
  const refreshTokenValue = getRefreshToken()

  // No session at all — go to login.
  if (!token && !refreshTokenValue) {
    return false
  }

  // A still-valid access token needs no refresh.
  if (token && !isAccessTokenExpired(token)) {
    return true
  }

  // No (or expired) access token — try to refresh. A transient refresh failure
  // (500/timeout/offline) preserves the stored tokens, so the user should stay
  // put and let the next action retry instead of bouncing to /login.
  // refreshAuthToken() only clears the session on a definitive 401.
  try {
    await refreshAuthToken()
    return Boolean(getAuthToken())
  } catch {
    return Boolean(getAuthToken() || getRefreshToken())
  }
}

router.beforeEach(async (to) => {
  const authPages = ['Login', 'ClubRegistration', 'ClubPresidentRegistration']

  if (to.meta.requiresAuth) {
    const ok = await ensureSession()
    return ok ? true : { name: 'Login' }
  }

  if (getAuthToken() && authPages.includes(to.name)) {
    return { name: 'HomeDashboard' }
  }

  return true
})

export default router