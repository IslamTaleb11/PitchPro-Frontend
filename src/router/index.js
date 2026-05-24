import { createRouter, createWebHistory } from 'vue-router'
import ClubRegistration from '../views/ClubRegistration.vue'
import Login from '../views/Login.vue'
import ClubPresidentRegistration from '../views/ClubPresidentRegistration.vue'
import StaffManagementDashboard from '../views/StaffManagementDashboard.vue'
import CategoryManagementDashboard from '../views/CategoryManagementDashboard.vue'

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
    component: StaffManagementDashboard
  },
  {
    path: '/dashboard/categories',
    name: 'CategoryManagementDashboard',
    component: CategoryManagementDashboard
  },
  {
    path: '/dashboard/players',
    name: 'PlayerAcquisition',
    component: () => import('../views/PlayerAcquisition.vue')
  },
  {
    path: '/dashboard/matches',
    name: 'MatchesDashboard',
    component: () => import('../views/MatchesDashboard.vue')
  },
  {
    path: '/dashboard/schedule',
    name: 'ScheduleDashboard',
    component: () => import('../views/ScheduleDashboard.vue')
  },
  {
    path: '/dashboard/training',
    name: 'TrainingDashboard',
    component: () => import('../views/TrainingDashboard.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router