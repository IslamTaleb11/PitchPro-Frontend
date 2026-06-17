import api from './axiosConfig'

export async function login(email, password) {
  return api.post('/auth/login', {
    email,
    password
  })
}