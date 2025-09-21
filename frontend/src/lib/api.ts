import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const auth = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (email: string, name: string, password: string, classCode: string) =>
    api.post('/auth/register', { email, name, password, classCode }),

  teacherLogin: (email: string, teacherCode: string) =>
    api.post('/auth/teacher-login', { email, teacherCode }),
}

export const learning = {
  getPracticeWords: (listId?: string) =>
    api.get(`/learning/practice${listId ? `/${listId}` : ''}`),

  submitResults: (results: any[]) =>
    api.post('/learning/practice/results', { results }),

  getProgress: () =>
    api.get('/learning/progress'),
}