import { createRouter, createWebHistory } from 'vue-router'
import ClubRegistration from '../views/ClubRegistration.vue'
import Login from '../views/Login.vue'
import ClubPresidentRegistration from '../views/ClubPresidentRegistration.vue'
import StaffManagementDashboard from '../views/StaffManagementDashboard.vue'

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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router