import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import router from '../router'

// 创建axios实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  response => {
    const { code, message, data } = response.data
    
    if (code === 200) {
      return data
    } else {
      // 处理业务错误
      return Promise.reject(new Error(message || '请求失败'))
    }
  },
  error => {
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          // token失效，清除本地存储并跳转到登录页（仅当不在登录页时）
          localStorage.removeItem('token')
          localStorage.removeItem('userInfo')
          if (router.currentRoute.value.path !== '/login') {
            router.push('/login')
          }
          break
        case 403:
          // 权限不足
          console.error('权限不足:', data.message)
          break
        case 404:
          console.error('资源不存在:', data.message)
          break
        case 500:
          console.error('服务器错误:', data.message)
          break
        default:
          console.error('请求错误:', error.message)
      }
    } else if (error.request) {
      // 请求未收到响应
      console.error('网络错误，请检查网络连接')
    } else {
      console.error('请求配置错误:', error.message)
    }
    
    return Promise.reject(error)
  }
)

export const useUserStore = defineStore('user', () => {
  // 状态
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || 'null'))
  const permissions = ref([])
  const isLoggedIn = computed(() => !!token.value)

  // 登录
  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password })
      const { token: newToken, user } = response
      
      // 保存token和用户信息
      token.value = newToken
      userInfo.value = user
      
      localStorage.setItem('token', newToken)
      localStorage.setItem('userInfo', JSON.stringify(user))
      
      // 获取用户权限
      await fetchPermissions()
      
      return { success: true, user }
    } catch (error) {
      return { success: false, message: error.message }
    }
  }

  // 退出登录
  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      // 忽略登出错误
    } finally {
      // 清除本地存储
      token.value = ''
      userInfo.value = null
      permissions.value = []
      
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
    }
  }

  // 获取当前用户信息
  const fetchCurrentUser = async () => {
    try {
      const user = await api.get('/auth/me')
      userInfo.value = user
      localStorage.setItem('userInfo', JSON.stringify(user))
      return user
    } catch (error) {
      console.error('获取用户信息失败:', error)
      throw error
    }
  }

  // 修改密码
  const changePassword = async (oldPassword, newPassword) => {
    try {
      await api.post('/auth/change-password', { oldPassword, newPassword })
      return { success: true }
    } catch (error) {
      return { success: false, message: error.message }
    }
  }

  // 刷新token
  const refreshToken = async () => {
    try {
      const { token: newToken } = await api.post('/auth/refresh-token')
      token.value = newToken
      localStorage.setItem('token', newToken)
      return newToken
    } catch (error) {
      console.error('刷新token失败:', error)
      throw error
    }
  }

  // 获取用户权限
  const fetchPermissions = async () => {
    try {
      // 根据用户角色获取权限
      const role = userInfo.value?.role
      if (!role) return
      
      // 这里可以根据角色定义权限
      const rolePermissions = {
        admin: ['*'],
        boss: ['read:*', 'export:*'],
        purchase: ['read:product', 'read:fba', 'read:order'],
        warehouse: ['read:product', 'read:fba', 'read:order'],
        finance: ['read:order', 'read:business', 'export:*'],
        sales: ['read:product', 'read:order', 'read:business']
      }
      
      permissions.value = rolePermissions[role] || []
    } catch (error) {
      console.error('获取权限失败:', error)
    }
  }

  // 检查权限
  const hasPermission = (permission) => {
    if (!permissions.value.length) return false
    if (permissions.value.includes('*')) return true
    
    return permissions.value.includes(permission)
  }

  // 检查角色
  const hasRole = (role) => {
    return userInfo.value?.role === role
  }

  // 初始化
  const init = async () => {
    if (token.value) {
      try {
        await fetchCurrentUser()
        await fetchPermissions()
      } catch (error) {
        // token失效，清除存储
        token.value = ''
        userInfo.value = null
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
      }
    }
  }

  // 导出api实例，方便其他store使用
  const $api = api

  return {
    // 状态
    token,
    userInfo,
    permissions,
    isLoggedIn,
    
    // 方法
    login,
    logout,
    fetchCurrentUser,
    changePassword,
    refreshToken,
    hasPermission,
    hasRole,
    init,
    
    // api实例
    $api
  }
})