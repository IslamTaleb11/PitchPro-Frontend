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

export { refreshAuthToken }
