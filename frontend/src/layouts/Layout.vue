<template>
  <div class="layout-wrapper">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ 'is-collapse': isCollapse }">
      <!-- Logo 区域 -->
      <div class="sidebar-logo">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>
          </svg>
        </div>
        <span v-if="!isCollapse" class="logo-text">Amazon ERP</span>
      </div>

      <!-- 菜单 -->
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :collapse-transition="false"
        background-color="#1a1a2e"
        text-color="#a0a0b0"
        active-text-color="#ffffff"
        class="sidebar-menu"
      >
        <el-menu-item index="/cockpit" @click="navigateTo('/cockpit')">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>经营驾驶舱</template>
        </el-menu-item>

        <el-menu-item index="/shops" @click="navigateTo('/shops')">
          <el-icon><Shop /></el-icon>
          <template #title>店铺管理</template>
        </el-menu-item>

        <el-sub-menu index="/products">
          <template #title>
            <el-icon><Goods /></el-icon>
            <span>商品资料</span>
          </template>
          <el-menu-item index="/products/list" @click="navigateTo('/products/list')">商品资料列表</el-menu-item>
          <el-menu-item index="/products/upload" @click="navigateTo('/products/upload')">商品上传</el-menu-item>
          <el-menu-item index="/products/category" @click="navigateTo('/products/category')">分类设置</el-menu-item>
          <el-menu-item index="/products/inventory-log" @click="navigateTo('/products/inventory-log')">出入库记录</el-menu-item>
          <el-menu-item index="/products/mapping" @click="navigateTo('/products/mapping')">映射管理</el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/orders/summary" @click="navigateTo('/orders/summary')">
          <el-icon><Tickets /></el-icon>
          <template #title>订单销量汇总</template>
        </el-menu-item>

        <el-sub-menu index="/fba">
          <template #title>
            <el-icon><Box /></el-icon>
            <span>FBA管理</span>
          </template>
          <el-menu-item index="/fba/inventory" @click="navigateTo('/fba/inventory')">FBA库存</el-menu-item>
          <el-menu-item index="/fba/reserved" @click="navigateTo('/fba/reserved')">FBA预留</el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/logistics" @click="navigateTo('/logistics')">
          <el-icon><Van /></el-icon>
          <template #title>物流跟踪</template>
        </el-menu-item>

        <el-menu-item index="/business" @click="navigateTo('/business')">
          <el-icon><TrendCharts /></el-icon>
          <template #title>业务报告</template>
        </el-menu-item>

        <el-menu-item index="/data-summary" @click="navigateTo('/data-summary')">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>数据汇总</template>
        </el-menu-item>

        <el-sub-menu index="/system" v-if="userInfo?.role === 'admin'">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统管理</span>
          </template>
          <el-menu-item index="/admin/users" @click="navigateTo('/admin/users')">用户管理</el-menu-item>
          <el-menu-item index="/admin/upload-logs" @click="navigateTo('/admin/upload-logs')">上传日志</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </aside>

    <!-- 主内容区 -->
    <div class="main-wrapper">
      <!-- 顶部导航 -->
      <header class="top-header">
        <div class="header-left">
          <el-button text @click="toggleCollapse" class="collapse-btn">
            <el-icon size="20"><Expand v-if="isCollapse" /><Fold v-else /></el-icon>
          </el-button>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-for="item in breadcrumb" :key="item.path">
              {{ item.meta?.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>

<div class="header-right">
          <!-- 全局店铺选择器 -->
          <el-select
            v-if="shopStore.shops.length > 0"
            v-model="shopStore.currentShopCode"
            placeholder="选择店铺"
            style="width: 160px; margin-right: 12px;"
            clearable
            filterable
            @change="handleShopChange"
          >
            <el-option
              v-for="shop in shopStore.shops"
              :key="shop.shop_code"
              :label="shop.shop_name"
              :value="shop.shop_code"
            />
          </el-select>

          <!-- 通知 -->
          <el-badge :value="3" class="header-badge">
            <el-button text circle>
              <el-icon size="18"><Bell /></el-icon>
            </el-button>
          </el-badge>

          <!-- 用户信息 -->
          <el-dropdown @command="handleUserCommand" trigger="click">
            <div class="user-info">
              <el-avatar :size="32" color="#409EFF">
                {{ userInfo?.username?.charAt(0)?.toUpperCase() || 'U' }}
              </el-avatar>
              <span class="username">{{ userInfo?.realName || userInfo?.username || '用户' }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>个人中心
                </el-dropdown-item>
                <el-dropdown-item command="password">
                  <el-icon><Lock /></el-icon>修改密码
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- 页面内容 -->
      <main class="page-content">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>

      <!-- 页脚 -->
      <footer class="page-footer">
        <span>Amazon ERP System</span>
        <span class="divider">|</span>
        <span>v1.0.0</span>
        <span class="divider">|</span>
        <span>© 2026</span>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Shop, Goods, Tickets, Box, TrendCharts, DataAnalysis, Setting,
  Bell, User, Lock, SwitchButton, Expand, Fold, ArrowDown, Van
} from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import { useShopStore } from '../stores/shop'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const shopStore = useShopStore()

const isCollapse = ref(false)
const userInfo = computed(() => userStore.userInfo)

const activeMenu = computed(() => route.path)

const breadcrumb = computed(() => {
  return route.matched.filter(item => item.meta?.title).slice(1)
})

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

const navigateTo = (path) => {
  router.push(path)
}

const handleShopChange = async (shopCode) => {
  await shopStore.switchShop(shopCode)
  // 触发页面刷新
  router.go(0)
}

const handleUserCommand = async (command) => {
  switch (command) {
    case 'profile':
      ElMessage.info('个人中心功能开发中')
      break
    case 'password':
      try {
        const { value: password } = await ElMessageBox.prompt('请输入新密码（至少6位）', '修改密码', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputPattern: /.{6,}/,
          inputErrorMessage: '密码至少6位'
        })
        ElMessage.success('密码修改成功')
      } catch {
        // 取消输入
      }
      break
    case 'logout':
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        await userStore.logout()
        router.push('/login')
        ElMessage.success('退出成功')
      } catch {
        // 取消退出
      }
      break
  }
}

onMounted(() => {
  // 加载全局店铺列表
  shopStore.loadShops()
})
</script>

<style scoped>
/* 布局整体 */
.layout-wrapper {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: #f0f2f5;
}

/* 侧边栏 */
.sidebar {
  width: 220px;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  flex-shrink: 0;
}

.sidebar.is-collapse {
  width: 64px;
}

.sidebar-logo {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-icon {
  color: #409EFF;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-menu::-webkit-scrollbar {
  width: 4px;
}

.sidebar-menu::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

:deep(.el-menu) {
  background-color: transparent !important;
}

:deep(.el-menu-item),
:deep(.el-sub-menu__title) {
  height: 50px;
  line-height: 50px;
  margin: 4px 8px;
  border-radius: 8px;
}

:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
  background: rgba(64, 158, 255, 0.15) !important;
}

:deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, #409EFF 0%, #36cfc9 100%) !important;
}

:deep(.el-sub-menu .el-menu-item) {
  height: 44px;
  line-height: 44px;
  margin: 2px 8px;
  padding-left: 48px !important;
}

/* 主内容区 */
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* 顶部导航 */
.top-header {
  height: 60px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  color: #666;
}

.collapse-btn:hover {
  color: #409EFF;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-badge {
  margin-top: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s;
}

.user-info:hover {
  background: #f5f5f5;
}

.username {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

/* 页面内容 */
.page-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f0f2f5;
}

.page-content::-webkit-scrollbar {
  width: 6px;
}

.page-content::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}

.page-content::-webkit-scrollbar-track {
  background: #f0f0f0;
}

/* 页脚 */
.page-footer {
  height: 40px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #999;
  font-size: 12px;
  border-top: 1px solid #f0f0f0;
}

.page-footer .divider {
  color: #dcdfe6;
}

/* 路由过渡动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
