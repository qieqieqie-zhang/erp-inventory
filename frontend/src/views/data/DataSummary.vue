<template>
  <div class="data-summary-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>数据汇总</h2>
      <div class="header-actions">
        <el-button type="primary" :icon="Download" @click="exportAllData">
          导出全部数据
        </el-button>
        <el-button :icon="Refresh" @click="refreshData">
          刷新
        </el-button>
        <el-button type="info" :icon="Setting" @click="showSettings">
          设置
        </el-button>
      </div>
    </div>

    <!-- 数据汇总卡片 -->
    <div class="summary-cards">
      <el-row :gutter="20">
        <el-col :span="6" v-for="card in summaryCards" :key="card.id">
          <el-card shadow="hover" class="summary-card">
            <div class="card-content">
              <div class="card-icon" :style="{ backgroundColor: card.color }">
                <el-icon><component :is="card.icon" /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-label">{{ card.label }}</div>
                <div class="card-value">{{ formatNumber(card.value) }}</div>
                <div class="card-unit">{{ card.unit }}</div>
              </div>
              <div class="card-trend" :class="card.trendClass">
                <el-icon><CaretTop v-if="card.trend > 0" /><CaretBottom v-else /></el-icon>
                <span>{{ card.trend > 0 ? '+' : '' }}{{ card.trend }}%</span>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 数据模块列表 -->
    <div class="data-modules">
      <h3>数据模块</h3>
      <el-row :gutter="20">
        <el-col :span="6" v-for="module in dataModules" :key="module.id">
          <el-card shadow="never" class="module-card" @click="navigateToModule(module.path)">
            <div class="module-content">
              <div class="module-icon">
                <el-icon><component :is="module.icon" /></el-icon>
              </div>
              <div class="module-info">
                <div class="module-name">{{ module.name }}</div>
                <div class="module-desc">{{ module.description }}</div>
              </div>
              <div class="module-stat">
                <div class="stat-value">{{ module.count }}</div>
                <div class="stat-label">记录数</div>
              </div>
              <el-icon class="arrow-icon"><ArrowRight /></el-icon>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 快速操作 -->
    <div class="quick-actions">
      <h3>快速操作</h3>
      <div class="actions-grid">
        <el-button 
          v-for="action in quickActions" 
          :key="action.id"
          :type="action.type" 
          :icon="action.icon"
          @click="handleQuickAction(action.id)"
        >
          {{ action.name }}
        </el-button>
      </div>
    </div>

    <!-- 数据状态 -->
    <div class="data-status">
      <h3>数据状态</h3>
      <el-timeline>
        <el-timeline-item
          v-for="status in dataStatus"
          :key="status.id"
          :timestamp="status.timestamp"
          :color="status.color"
          placement="top"
        >
          <el-card>
            <div class="status-content">
              <div class="status-title">{{ status.title }}</div>
              <div class="status-message">{{ status.message }}</div>
              <el-tag :type="status.statusType" size="small">
                {{status.statusText}}
              </el-tag>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Download,
  Refresh,
  Setting,
  TrendCharts,
  Box,
  ShoppingCart,
  Document,
  User,
  DataLine,
  Upload,
  Delete,
  Warning,
  Wallet,
  Star,
  ArrowRight,
  Top,
  Bottom,
  CaretTop,
  CaretBottom
} from '@element-plus/icons-vue'
import { apiService } from '@/utils/api'

const router = useRouter()
const loading = ref(false)

// 数据汇总卡片
const summaryCards = ref([
  { 
    id: 1, 
    label: '总商品数', 
    value: 1256, 
    unit: '个', 
    icon: 'Box', 
    color: '#409EFF',
    trend: 12.5,
    trendClass: 'positive'
  },
  { 
    id: 2, 
    label: '总订单数', 
    value: 8560, 
    unit: '单', 
    icon: 'ShoppingCart', 
    color: '#67C23A',
    trend: 8.3,
    trendClass: 'positive'
  },
  { 
    id: 3, 
    label: '业务报告数', 
    value: 42, 
    unit: '份', 
    icon: 'Document', 
    color: '#E6A23C',
    trend: 2.1,
    trendClass: 'positive'
  },
  { 
    id: 4, 
    label: '活跃用户', 
    value: 7, 
    unit: '人', 
    icon: 'User', 
    color: '#F56C6C',
    trend: 0,
    trendClass: 'neutral'
  },
])

// 数据模块
const dataModules = ref([
  {
    id: 1,
    name: '产品管理',
    description: '商品库存数据',
    icon: 'Box',
    path: '/product/list',
    count: 1256
  },
  {
    id: 2, 
    name: '订单管理',
    description: '亚马逊订单数据',
    icon: 'ShoppingCart',
    path: '/order/list',
    count: 8560
  },
  {
    id: 3,
    name: 'FBA库存',
    description: 'FBA库存数据',
    icon: 'DataLine',
    path: '/fba/inventory',
    count: 345
  },
  {
    id: 4,
    name: '业务报告',
    description: '业务分析报告',
    icon: 'Document',
    path: '/business/report',
    count: 42
  },
  {
    id: 5,
    name: '上传日志',
    description: '数据上传记录',
    icon: 'Upload',
    path: '/admin/upload-logs',
    count: 128
  },
  {
    id: 6,
    name: '用户管理',
    description: '系统用户信息',
    icon: 'User',
    path: '/admin/users',
    count: 7
  }
])

// 快速操作
const quickActions = ref([
  { id: 1, name: '批量上传', icon: 'Upload', type: 'primary' },
  { id: 2, name: '数据备份', icon: 'Download', type: 'success' },
  { id: 3, name: '清理缓存', icon: 'Delete', type: 'warning' },
  { id: 4, name: '刷新数据', icon: 'Refresh', type: 'info' },
  { id: 5, name: '生成报告', icon: 'DocumentAdd', type: '' },
  { id: 6, name: '系统设置', icon: 'Setting', type: '' }
])

// 数据状态
const dataStatus = ref([
  {
    id: 1,
    title: '数据库备份',
    message: '每日自动备份已完成',
    timestamp: '2024-03-15 03:00',
    color: '#67C23A',
    statusType: 'success',
    statusText: '已完成'
  },
  {
    id: 2,
    title: '数据同步',
    message: '同步亚马逊订单数据',
    timestamp: '2024-03-15 02:30',
    color: '#409EFF',
    statusType: 'primary',
    statusText: '进行中'
  },
  {
    id: 3,
    title: '库存预警检查',
    message: '发现5个商品库存不足',
    timestamp: '2024-03-15 02:00',
    color: '#E6A23C',
    statusType: 'warning',
    statusText: '待处理'
  },
  {
    id: 4,
    title: '数据清理',
    message: '清理旧日志数据',
    timestamp: '2024-03-15 01:30',
    color: '#909399',
    statusType: 'info',
    statusText: '已完成'
  }
])

// 辅助函数
const formatNumber = (num) => {
  return num?.toLocaleString() || '0'
}

// 导航到模块
const navigateToModule = (path) => {
  router.push(path)
}

// 处理快速操作
const handleQuickAction = (actionId) => {
  const actions = {
    1: () => {
      ElMessage.info('打开批量上传功能...')
      router.push('/product/upload')
    },
    2: () => {
      ElMessage.info('开始数据备份...')
      // TODO: 调用备份API
    },
    3: () => {
      ElMessage.warning('清理缓存功能开发中...')
    },
    4: () => {
      refreshData()
      ElMessage.success('数据已刷新')
    },
    5: () => {
      ElMessage.info('生成报告功能开发中...')
    },
    6: () => {
      ElMessage.info('系统设置功能开发中...')
    }
  }
  
  if (actions[actionId]) {
    actions[actionId]()
  }
}

// 导出全部数据
const exportAllData = () => {
  ElMessage.info('导出全部数据功能开发中...')
}

// 刷新数据
const refreshData = async () => {
  loading.value = true
  try {
    const [productStats, orderSummary, businessReportCount] = await Promise.allSettled([
      apiService.products.getStats(),
      apiService.orders.getSummary({}),
      apiService.business.getReports({ page: 1, pageSize: 1 })
    ])

    // 更新商品数
    if (productStats.status === 'fulfilled' && productStats.value) {
      const stats = productStats.value
      const totalProducts = (stats.total || 0)
      summaryCards.value[0].value = totalProducts
      dataModules.value[0].count = totalProducts
    }

    // 更新订单数
    if (orderSummary.status === 'fulfilled' && orderSummary.value) {
      const summary = orderSummary.value
      const totalOrders = summary.total_orders || 0
      summaryCards.value[1].value = totalOrders
      dataModules.value[1].count = totalOrders
    }

    // 更新业务报告数
    if (businessReportCount.status === 'fulfilled' && businessReportCount.value) {
      const total = businessReportCount.value.pagination?.total || 0
      summaryCards.value[2].value = total
      dataModules.value[3].count = total
    }

    ElMessage.success('数据汇总已刷新')
  } catch (error) {
    console.error('刷新汇总数据失败:', error)
    ElMessage.error('刷新失败')
  } finally {
    loading.value = false
  }
}

// 显示设置
const showSettings = () => {
  ElMessage.info('数据汇总设置功能开发中...')
}

// 组件初始化
onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.data-summary-container {
  padding: 20px;
  background-color: #f5f7fa;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.summary-cards {
  margin-bottom: 30px;
}

.summary-card {
  border-radius: 8px;
}

.card-content {
  display: flex;
  align-items: center;
  height: 100px;
}

.card-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 20px;
  color: white;
}

.card-info {
  flex: 1;
}

.card-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 5px;
}

.card-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 2px;
}

.card-unit {
  font-size: 12px;
  color: #909399;
}

.card-trend {
  display: flex;
  align-items: center;
  font-size: 14px;
  margin-left: 10px;
}

.card-trend.positive {
  color: #67C23A;
}

.card-trend.negative {
  color: #F56C6C;
}

.card-trend.neutral {
  color: #909399;
}

.card-trend .el-icon {
  margin-right: 4px;
}

.data-modules {
  margin-bottom: 30px;
}

.data-modules h3 {
  color: #303133;
  margin-bottom: 20px;
}

.module-card {
  cursor: pointer;
  transition: all 0.3s;
  height: 100px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.module-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
}

.module-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.module-icon {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  background-color: #409EFF;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  color: white;
  font-size: 20px;
}

.module-info {
  flex: 1;
}

.module-name {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.module-desc {
  font-size: 12px;
  color: #909399;
}

.module-stat {
  text-align: center;
  margin-right: 15px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.arrow-icon {
  color: #C0C4CC;
  font-size: 16px;
}

.quick-actions {
  margin-bottom: 30px;
}

.quick-actions h3 {
  color: #303133;
  margin-bottom: 20px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.el-button {
  height: 60px;
  font-size: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.el-button .el-icon {
  font-size: 20px;
  margin-bottom: 8px;
}

.data-status {
  margin-bottom: 20px;
}

.data-status h3 {
  color: #303133;
  margin-bottom: 20px;
}

.status-content {
  padding: 10px;
}

.status-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.status-message {
  font-size: 14px;
  color: #606266;
  margin-bottom: 10px;
}

.el-timeline {
  padding-left: 20px;
}

.el-timeline-item__timestamp {
  color: #909399;
  font-size: 14px;
}
</style>