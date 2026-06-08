import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, register, getProfile, logout as apiLogout } from '@/api/auth'
import { ElMessage } from 'element-plus'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || '')
  const loading = ref(false)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  const setToken = (newToken) => {
    token.value = newToken
    if (newToken) {
      localStorage.setItem('token', newToken)
    } else {
      localStorage.removeItem('token')
    }
  }

  const setUser = (userData) => {
    user.value = userData
  }

  const handleLogin = async (credentials) => {
    loading.value = true
    try {
      const response = await login(credentials)
      setToken(response.token)
      setUser(response.user)
      ElMessage.success('登录成功')
      return true
    } catch (error) {
      ElMessage.error(error.message || '登录失败')
      return false
    } finally {
      loading.value = false
    }
  }

  const handleRegister = async (userData) => {
    loading.value = true
    try {
      const response = await register(userData)
      setToken(response.token)
      setUser(response.user)
      ElMessage.success('注册成功')
      return true
    } catch (error) {
      ElMessage.error(error.message || '注册失败')
      return false
    } finally {
      loading.value = false
    }
  }

  const fetchProfile = async () => {
    if (!token.value) return null
    
    try {
      const response = await getProfile()
      setUser(response.user)
      return response.user
    } catch (error) {
      setToken('')
      setUser(null)
      return null
    }
  }

  const handleLogout = async () => {
    try {
      await apiLogout()
    } catch (e) {
    }
    setToken('')
    setUser(null)
    ElMessage.success('已退出登录')
  }

  const updateUser = (userData) => {
    if (user.value) {
      user.value = { ...user.value, ...userData }
    }
  }

  return {
    user,
    token,
    loading,
    isLoggedIn,
    isAdmin,
    handleLogin,
    handleRegister,
    fetchProfile,
    handleLogout,
    setToken,
    setUser,
    updateUser
  }
})
