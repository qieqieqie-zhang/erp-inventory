import { createRouter, createWebHistory } from 'vue-router'

// 布局组件
import Layout from '../layouts/Layout.vue'

// 页面组件（使用懒加载）
const Login = () => import('../views/Login.vue')
const Cockpit = () => import('../views/cockpit/Cockpit.vue')
const ShopList = () => import('../views/shop/ShopList.vue')
const ProductList = () => import('../views/product/ProductList.vue')
const ProductUpload = () => import('../views/product/ProductUpload.vue')
const ProductDetail = () => import('../views/product/ProductDetail.vue')
const ProductCategory = () => import('../views/product/ProductCategory.vue')
const ProductNameSkuMapping = () => import('../views/product/ProductNameSkuMapping.vue')
const InventoryLog = () => import('../views/product/InventoryLog.vue')
const OrderSummary = () => import('../views/order/OrderSummary.vue')
const FBAInventory = () => import('../views/fba/FBAInventory.vue')
const FBAReserved = () => import('../views/fba/FBAReserved.vue')
const LogisticsList = () => import('../views/logistics/LogisticsList.vue')
const LogisticsDetail = () => import('../views/logistics/LogisticsDetail.vue')
const BusinessReport = () => import('../views/business/BusinessReport.vue')
const DataSummary = () => import('../views/data/DataSummary.vue')
const UserManagement = () => import('../views/admin/UserManagement.vue')
const UploadLogs = () => import('../views/admin/UploadLogs.vue')

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: Layout,
    redirect: '/cockpit',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'cockpit',
        name: 'Cockpit',
        component: Cockpit,
        meta: { title: '经营驾驶舱', icon: 'DataAnalysis' }
      },
      // 店铺管理
      {
        path: 'shops',
        name: 'Shops',
        component: ShopList,
        meta: { title: '店铺管理', icon: 'Shop' }
      },
      // 商品资料
      {
        path: 'products',
        name: 'Products',
        redirect: '/products/list',
        meta: { title: '商品资料', icon: 'Goods' },
        children: [
          {
            path: 'list',
            name: 'ProductList',
            component: ProductList,
            meta: { title: '商品资料列表' }
          },
          {
            path: 'upload',
            name: 'ProductUpload',
            component: ProductUpload,
            meta: { title: '商品上传' }
          },
          {
            path: 'category',
            name: 'ProductCategory',
            component: ProductCategory,
            meta: { title: '分类设置' }
          },
          {
            path: 'inventory-log',
            name: 'InventoryLog',
            component: InventoryLog,
            meta: { title: '出入库记录' }
          },
          {
            path: 'mapping',
            name: 'ProductNameSkuMapping',
            component: ProductNameSkuMapping,
            meta: { title: '映射管理' }
          },
          {
            path: 'detail/:sku',
            name: 'ProductDetail',
            component: ProductDetail,
            meta: { title: '商品详情', hidden: true }
          }
        ]
      },
      // 订单管理
      {
        path: 'orders',
        name: 'Orders',
        redirect: '/orders/summary',
        meta: { title: '订单管理', icon: 'Tickets' },
        children: [
          {
            path: 'summary',
            name: 'OrderSummary',
            component: OrderSummary,
            meta: { title: '订单销量汇总' }
          }
        ]
      },
      // FBA库存
      {
        path: 'fba',
        name: 'FBA',
        redirect: '/fba/inventory',
        meta: { title: 'FBA管理', icon: 'Box' },
        children: [
          {
            path: 'inventory',
            name: 'FBAInventory',
            component: FBAInventory,
            meta: { title: 'FBA库存' }
          },
          {
            path: 'reserved',
            name: 'FBAReserved',
            component: FBAReserved,
            meta: { title: 'FBA预留库存' }
          }
        ]
      },
      // 物流跟踪
      {
        path: 'logistics',
        name: 'Logistics',
        component: LogisticsList,
        meta: { title: '物流跟踪', icon: 'Van' }
      },
      {
        path: 'logistics/:id',
        name: 'LogisticsDetail',
        component: LogisticsDetail,
        meta: { title: '物流详情' }
      },
      // 业务报告
      {
        path: 'business',
        name: 'Business',
        component: BusinessReport,
        meta: { title: '业务报告', icon: 'TrendCharts' }
      },
      // 数据汇总
      {
        path: 'data-summary',
        name: 'DataSummary',
        component: DataSummary,
        meta: { title: '数据汇总中心', icon: 'DataAnalysis' }
      },
      // 系统管理（仅管理员）
      {
        path: 'admin',
        name: 'Admin',
        redirect: '/admin/users',
        meta: { title: '系统管理', icon: 'Setting', roles: ['admin'] },
        children: [
          {
            path: 'users',
            name: 'UserManagement',
            component: UserManagement,
            meta: { title: '用户管理' }
          },
          {
            path: 'upload-logs',
            name: 'UploadLogs',
            component: UploadLogs,
            meta: { title: '上传日志' }
          }
        ]
      }
    ]
  },
  // 404页面
  {
    path: '/:pathMatch(.*)*',
    redirect: '/cockpit'
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 获取token
  const token = localStorage.getItem('token')
  
  // 如果需要认证且没有token，重定向到登录页
  if (to.meta.requiresAuth && !token) {
    next('/login')
    return
  }
  
  // 如果有token且访问登录页，重定向到首页
  if (to.path === '/login' && token) {
    next('/dashboard')
    return
  }
  
  // 检查角色权限
  if (to.meta.roles) {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || 'null')
    const userRole = userInfo?.role
    if (!userRole || !to.meta.roles.includes(userRole)) {
      // 权限不足，重定向到首页
      next('/dashboard')
      return
    }
  }
  
  next()
})

export default router