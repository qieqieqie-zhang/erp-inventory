import axios from 'axios'
import { useShopStore } from '../stores/shop'

// 创建axios实例
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000
})

// 需要自动注入 shop_code 的模块
// URL 中的模块名可能与这里不完全一致，需要配置别名映射
const SHOP_AWARE_MODULES = [
  'cockpit',
  'products',    // 别名: product (单数)
  'orders',
  'fba',
  'logistics',
  'business',
  'domesticInventory',  // 别名: domestic-inventory (连字符)
  'productNameSkuMapping'  // 别名: product-name-sku-mapping (连字符)
]

// URL 模块名 -> shop_code 模块名的映射
const MODULE_ALIAS_MAP = {
  'product': 'products',
  'domestic-inventory': 'domesticInventory',
  'product-name-sku-mapping': 'productNameSkuMapping'
}

// 请求拦截器
api.interceptors.request.use(
  async (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // 自动设置 Content-Type 为 application/json（除非是 FormData 上传）
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json'
    }

    // 自动注入 shop_code
    const url = config.url || ''
    // 支持连字符的模块名 (如 domestic-inventory)
    const moduleMatch = url.match(/^\/([a-zA-Z-]+)/)
    if (moduleMatch) {
      // 获取原始模块名，并转换为标准模块名
      const rawModule = moduleMatch[1]
      const module = MODULE_ALIAS_MAP[rawModule] || rawModule
      if (SHOP_AWARE_MODULES.includes(module)) {
        // 获取当前店铺代码
        const shopStore = useShopStore()

        // 如果 shops 还没加载，等待一下（最多等3秒）
        if (shopStore.shops.length === 0) {
          const waitStart = Date.now()
          while (shopStore.shops.length === 0 && Date.now() - waitStart < 3000) {
            await new Promise(r => setTimeout(r, 100))
          }
        }

        const shopCode = shopStore.currentShopCode
        console.log('[API拦截器] 模块:', module, '当前店铺:', shopCode, 'URL:', url)
        if (shopCode) {
          // 合并到 params
          config.params = {
            ...config.params,
            shop_code: shopCode
          }
          console.log('[API拦截器] 已注入 shop_code:', shopCode)
        }
      }
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
          // token过期或无效，清除token并跳转到登录页（仅当不在登录页时）
          localStorage.removeItem('token')
          localStorage.removeItem('userInfo')
          if (!location.pathname.startsWith('/login')) {
            window.location.href = '/login'
          }
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
  // 用户认证
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    logout: () => api.post('/auth/logout'),
    getProfile: () => api.get('/auth/profile')
  },
  
  // 订单管理
  orders: {
    // 上传订单报告
    upload: (formData) => api.post('/orders/upload', formData),

    // 获取订单汇总统计
    getSummary: (params) => api.get('/orders/summary', { params }),

    // 获取 SKU 销量汇总列表
    getSkuList: (params) => api.get('/orders/sku-list', { params }),

    // 获取 SKU 订单明细
    getSkuDetails: (sku, params) => api.get(`/orders/sku/${sku}/details`, { params }),

    // 获取图表数据
    getChartsData: (params) => api.get('/orders/charts', { params }),

    // 获取补货辅助数据
    getReplenishment: (params) => api.get('/orders/replenishment', { params }),

    // 导出 SKU 汇总数据
    exportSkuSummary: (params) => api.get('/orders/export', {
      params,
      responseType: 'blob'
    }),

    // 清空所有订单数据
    deleteAll: () => api.delete('/orders/all'),

    // 按SKU删除订单数据
    deleteBySku: (sku) => api.delete(`/orders/sku/${sku}`)
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
      getDetail: (sku) => api.get(`/fba/inventory/detail/${sku}`),
      deleteAll: () => api.delete('/fba/inventory/all')
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
      getDistribution: () => api.get('/fba/reserved/distribution'),
      deleteAll: () => api.delete('/fba/reserved/all')
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
    syncProducts: (id) => api.post(`/logistics/sync-products/${id}`),
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
    getStats: (params) => api.get('/product/stats', { params }),
    
    // 获取SKU列表（用于下拉选择）
    getSkuList: () => api.get('/product/sku-list'),
    
    // 导出产品数据（CSV/JSON格式）
    exportData: (format = 'json') => api.get('/product/export', {
      params: { format },
      responseType: 'blob'
    })
  },

  // 商品资料 - 中文名称↔SKU映射管理
  productNameSkuMapping: {
    getList: (params) => api.get('/product-name-sku-mapping/list', { params }),
    upsert: (data) => api.post('/product-name-sku-mapping/upsert', data),
    delete: (id) => api.delete(`/product-name-sku-mapping/${id}`),
    importFromProducts: (data) => api.post('/product-name-sku-mapping/import-from-products', data)
  },

  // 商品资料 - 分类管理
  category: {
    // 获取分类列表（分页）
    getList: (params) => api.get('/category/list', { params }),

    // 获取所有启用的分类（下拉用）
    getAllEnabled: () => api.get('/category/all'),

    // 获取单个分类
    getById: (id) => api.get(`/category/${id}`),

    // 创建分类
    create: (data) => api.post('/category', data),

    // 更新分类
    update: (id, data) => api.put(`/category/${id}`, data),

    // 删除分类
    delete: (id) => api.delete(`/category/${id}`)
  },

  // 国内库存管理
  domesticInventory: {
    // 获取库存列表
    getList: (params) => api.get('/domestic-inventory/list', { params }),

    // 获取库存详情
    getDetail: (sku) => api.get(`/domestic-inventory/${sku}`),

    // 获取库存统计
    getStats: () => api.get('/domestic-inventory/stats'),

    // 创建库存记录
    create: (data) => api.post('/domestic-inventory', data),

    // 更新库存
    update: (sku, data) => api.put(`/domestic-inventory/${sku}`, data),

    // 删除库存记录
    delete: (sku) => api.delete(`/domestic-inventory/${sku}`),

    // 库存变动
    changeStock: (data) => api.post('/domestic-inventory/change', data),

    // 获取变动日志
    getLogs: (params) => api.get('/domestic-inventory/logs', { params }),

    // 获取日志统计
    getLogStats: (params) => api.get('/domestic-inventory/log-stats', { params }),

    // 获取业务类型列表
    getBizTypes: () => api.get('/domestic-inventory/biz-types'),

    // 获取变动类型列表
    getChangeTypes: () => api.get('/domestic-inventory/change-types')
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
  },

  // 经营驾驶舱
  cockpit: {
    getOverview: (params) => api.get('/cockpit/overview', { params }),
    getCoreTable: (params) => api.get('/cockpit/core-table', { params }),
    getAlerts: (params) => api.get('/cockpit/alerts', { params }),
    getTrends: (params) => api.get('/cockpit/trends', { params })
  }
}

export default api