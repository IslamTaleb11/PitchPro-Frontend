import api from './axiosConfig'
import { refreshAuthToken } from './axiosConfig'

export async function login(email, password) {
  return api.post('/auth/login', {
    email,
    password
  })
}

export async function upgradeToken() {
  return api.post('/payment/upgrade-token')
}

export async function verifyEmail(token) {
  return api.get('/verify-email', { params: { token } })
}

export { refreshAuthToken }
