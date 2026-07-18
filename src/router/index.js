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
import { getAuthToken } from '../services/axiosConfig'

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
    path: '/dashboard/training',
    name: 'TrainingDashboard',
    component: () => import('../views/TrainingDashboard.vue'),
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

router.beforeEach((to) => {
  const isLoggedIn = Boolean(getAuthToken())
  const authPages = ['Login', 'ClubRegistration', 'ClubPresidentRegistration']

  if (to.meta.requiresAuth && !isLoggedIn) {
    return { name: 'Login' }
  }

  if (isLoggedIn && authPages.includes(to.name)) {
    return { name: 'StaffManagementDashboard' }
  }

  return true
})

export default router