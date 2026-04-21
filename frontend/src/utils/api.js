import axios from 'axios'

// 创建axios实例
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 统一处理响应格式
    if (response.data && response.data.code !== undefined) {
      if (response.data.code === 200) {
        return response.data.data
      } else {
        return Promise.reject(new Error(response.data.message || '请求失败'))
      }
    }
    return response.data
  },
  (error) => {
    // 统一错误处理
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // token过期或无效，清除token并跳转到登录页
          localStorage.removeItem('token')
          localStorage.removeItem('userInfo')
          window.location.href = '/login'
          break
        case 403:
          return Promise.reject(new Error('权限不足'))
        case 404:
          return Promise.reject(new Error('请求的资源不存在'))
        case 500:
          return Promise.reject(new Error('服务器内部错误'))
        default:
          return Promise.reject(new Error(error.response.data?.message || '请求失败'))
      }
    } else if (error.request) {
      return Promise.reject(new Error('网络连接失败，请检查网络设置'))
    } else {
      return Promise.reject(new Error('请求配置错误'))
    }
  }
)

// API接口定义
export const apiService = {
  // 数据看板
  dashboard: {
    getStats: (params) => api.get('/dashboard/stats', { params }),
    getTopProducts: (params) => api.get('/dashboard/top-products', { params }),
    getAlerts: (params) => api.get('/dashboard/alerts', { params }),
    getRecentUploads: (params) => api.get('/dashboard/recent-uploads', { params })
  },

  // 用户认证
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    logout: () => api.post('/auth/logout'),
    getProfile: () => api.get('/auth/profile')
  },
  
  // 订单管理
  orders: {
    // 获取订单列表（5个时间维度）
    getList: (dimension, params) => api.get(`/orders/${dimension}/list`, { params }),
    
    // 上传订单文件
    upload: (dimension, formData) => api.post(`/orders/${dimension}/upload`, formData),
    
    // 获取订单汇总
    getSummary: (params) => api.get(`/orders/${params.dimension}/summary`, { params }),
    
    // 导出订单数据
    exportData: (dimension, format) => api.get(`/orders/${dimension}/export`, {
      params: { format },
      responseType: 'blob'
    }),
    
    // 获取库存统计
    getStats: (dimension) => api.get(`/orders/${dimension}/stats`),
    
    // 获取订单详情
    getDetail: (id) => api.get(`/orders/detail/${id}`),
    
    // 获取低库存预警
    getLowStockAlerts: () => api.get('/orders/alerts')
  },
  
  // FBA库存管理
  fba: {
    // FBA库存
    inventory: {
      getList: (params) => api.get('/fba/inventory/list', { params }),
      upload: (formData) => api.post('/fba/inventory/upload', formData),
      getStats: () => api.get('/fba/inventory/stats'),
      getAlerts: () => api.get('/fba/inventory/alerts'),
      exportData: (format) => api.get('/fba/inventory/export', {
        params: { format },
        responseType: 'blob'
      }),
      getDetail: (sku) => api.get(`/fba/inventory/detail/${sku}`)
    },
    
    // FBA预留库存
    reserved: {
      getList: (params) => api.get('/fba/reserved/list', { params }),
      upload: (formData) => api.post('/fba/reserved/upload', formData),
      getStats: () => api.get('/fba/reserved/stats'),
      exportData: (format) => api.get('/fba/reserved/export', {
        params: { format },
        responseType: 'blob'
      }),
      getDetail: (sku) => api.get(`/fba/reserved/detail/${sku}`),
      getDistribution: () => api.get('/fba/reserved/distribution')
    }
  },

  // 物流跟踪
  logistics: {
    getList: (params) => api.get('/logistics/list', { params }),
    getDetail: (id) => api.get(`/logistics/detail/${id}`),
    create: (data) => api.post('/logistics', data),
    update: (id, data) => api.put(`/logistics/${id}`, data),
    updateStatus: (id, data) => api.patch(`/logistics/${id}/status`, data),
    updateSkuList: (formData) => api.post('/logistics/update-sku-list', formData),
    previewSkuList: (formData) => api.post('/logistics/preview-sku', formData),
    delete: (id) => api.delete(`/logistics/${id}`),
    getStats: (params) => api.get('/logistics/stats', { params }),
    getStatusList: () => api.get('/logistics/status-list'),
    getCompanies: () => api.get('/logistics/companies'),
    upload: (formData) => api.post('/logistics/upload', formData),
    exportData: (params) => api.get('/logistics/export', {
      params,
      responseType: 'blob'
    })
  },
  
  // 商品管理 - 产品管理模块完整API
  products: {
    // 获取产品列表（带分页、搜索、筛选）
    getList: (params) => api.get('/product/list', { params }),
    
    // 上传产品库存文件
    upload: (formData) => api.post('/product/upload', formData),
    
    // 获取产品详情
    getDetail: (sku) => api.get(`/product/detail/${sku}`),
    
    // 更新产品信息
    update: (sku, data) => api.put(`/product/${sku}`, data),
    
    // 删除产品
    delete: (sku) => api.delete(`/product/${sku}`),
    
    // 获取产品统计信息
    getStats: () => api.get('/product/stats'),
    
    // 获取SKU列表（用于下拉选择）
    getSkuList: () => api.get('/product/sku-list'),
    
    // 导出产品数据（CSV/JSON格式）
    exportData: (format = 'json') => api.get('/product/export', {
      params: { format },
      responseType: 'blob'
    })
  },
  
  // 店铺管理
  shops: {
    // 获取所有店铺（下拉选择用）
    getAllShops: () => api.get('/shops/all'),
    // 获取店铺列表（带分页搜索）
    getList: (params) => api.get('/shops', { params }),
    // 获取店铺详情
    getDetail: (id) => api.get(`/shops/${id}`),
    // 创建店铺
    create: (data) => api.post('/shops', data),
    // 更新店铺
    update: (id, data) => api.put(`/shops/${id}`, data),
    // 删除店铺
    delete: (id) => api.delete(`/shops/${id}`),
    // 获取店铺统计
    getStats: () => api.get('/shops/stats')
  },

  // 业务报告
  business: {
    // 获取业务报告列表
    getReports: (params) => api.get('/business/reports', { params }),
    
    // 获取业务报告摘要
    getSummary: (params) => api.get('/business/summary', { params }),
    
    // 上传业务报告数据
    upload: (formData) => api.post('/business/upload', formData),
    
    // 删除业务报告
    deleteReport: (id) => api.delete(`/business/reports/${id}`),
    
    // 导出业务报告数据
    exportReports: (params) => api.get('/business/export', { 
      params,
      responseType: 'blob'
    })
  },
  
  // 系统管理
  admin: {
    users: {
      getList: (params) => api.get('/admin/users', { params }),
      create: (data) => api.post('/admin/users', data),
      update: (id, data) => api.put(`/admin/users/${id}`, data),
      delete: (id) => api.delete(`/admin/users/${id}`),
      resetPassword: (id) => api.post(`/admin/users/${id}/reset-password`)
    },
    uploadLogs: {
      getList: (params) => api.get('/admin/upload-logs', { params })
    }
  },

  // SKU库存日志
  skuInventoryLog: {
    getAllLogs: (params) => api.get('/sku-logs', { params }),
    getLogsBySku: (sku, params) => api.get(`/sku-logs/${sku}`, { params })
  }
}

export default api