<template>
  <div class="dashboard-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">数据看板</h1>
        <p class="page-subtitle">实时监控库存与销售数据 · {{ currentTime }}</p>
      </div>
      <div class="header-actions">
        <!-- 店铺选择 -->
        <el-select v-model="selectedShopId" placeholder="全部店铺" clearable filterable style="width: 200px; margin-right: 12px;" @change="onShopChange">
          <el-option
            v-for="shop in shopList"
            :key="shop.id"
            :label="shop.shop_name"
            :value="shop.id"
          />
        </el-select>
        <el-button type="primary" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
      </div>
    </div>

    <!-- 统计卡片区域 -->
    <div class="stats-cards">
      <div class="stat-card stat-primary">
        <div class="stat-icon">
          <el-icon><Goods /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">总商品数</div>
          <div class="stat-value">{{ stats.totalProducts | formatNumber }}</div>
          <div class="stat-desc">
            <span class="badge badge-success">在售 {{ stats.activeProducts | formatNumber }}</span>
          </div>
        </div>
        <div class="stat-trend trend-up">
          <el-icon><CaretTop /></el-icon>
          <span>12.5%</span>
        </div>
      </div>

      <div class="stat-card stat-success">
        <div class="stat-icon">
          <el-icon><Box /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">FBA可售库存</div>
          <div class="stat-value">{{ stats.fbaAvailable | formatNumber }}</div>
          <div class="stat-desc">
            <span class="badge badge-warning">在途 {{ stats.fbaInbound | formatNumber }}</span>
          </div>
        </div>
        <div class="stat-trend trend-up">
          <el-icon><CaretTop /></el-icon>
          <span>8.3%</span>
        </div>
      </div>

      <div class="stat-card stat-warning">
        <div class="stat-icon">
          <el-icon><TrendCharts /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">近7天销量</div>
          <div class="stat-value">{{ stats.sales7d | formatNumber }}</div>
          <div class="stat-desc">
            <span class="change-text positive">较上周 +12.5%</span>
          </div>
        </div>
        <div class="stat-trend trend-up">
          <el-icon><CaretTop /></el-icon>
          <span>12.5%</span>
        </div>
      </div>

      <div class="stat-card stat-info">
        <div class="stat-icon">
          <el-icon><Money /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">近30天销售额</div>
          <div class="stat-value">¥{{ stats.salesAmount30d | formatCurrency }}</div>
          <div class="stat-desc">
            <span class="change-text positive">较上月 +8.3%</span>
          </div>
        </div>
        <div class="stat-trend trend-up">
          <el-icon><CaretTop /></el-icon>
          <span>8.3%</span>
        </div>
      </div>
    </div>

    <!-- 图表和列表区域 -->
    <div class="content-grid">
      <!-- 销量TOP10 -->
      <div class="card sales-top">
        <div class="card-header">
          <h3>
            <el-icon><Top /></el-icon>
            销量TOP10商品
          </h3>
          <el-radio-group v-model="topChartPeriod" size="small">
            <el-radio-button label="7d">近7天</el-radio-button>
            <el-radio-button label="30d">近30天</el-radio-button>
          </el-radio-group>
        </div>
        <div class="card-body">
          <div v-if="topProducts.length === 0" class="empty-state">
            <el-empty description="暂无数据" />
          </div>
          <div v-else class="product-list">
            <div v-for="(product, index) in topProducts" :key="product.sku" class="product-item">
              <div class="product-rank" :class="'rank-' + (index + 1)">
                {{ index + 1 }}
              </div>
              <div class="product-info">
                <div class="product-name">{{ product.name }}</div>
                <div class="product-sku">{{ product.sku }}</div>
              </div>
              <div class="product-stats">
                <div class="sales-count">{{ product.sales }} 件</div>
                <div class="sales-amount">¥{{ product.amount | formatCurrency }}</div>
              </div>
              <el-progress
                :percentage="(product.sales / topProducts[0].sales * 100)"
                :stroke-width="6"
                :show-text="false"
                :color="getRankColor(index)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 库存预警 -->
      <div class="card inventory-alerts">
        <div class="card-header">
          <h3>
            <el-icon><WarningFilled /></el-icon>
            库存预警
          </h3>
          <el-tag type="danger" size="small">{{ alerts.length }} 个预警</el-tag>
        </div>
        <div class="card-body">
          <div v-if="alerts.length === 0" class="empty-state">
            <el-empty description="库存状况良好">
            </el-empty>
          </div>
          <div v-else class="alert-list">
            <div v-for="alert in alerts" :key="alert.sku" class="alert-item">
              <div class="alert-icon" :class="'alert-' + alert.type">
                <el-icon v-if="alert.type === 'low'"><Warning /></el-icon>
                <el-icon v-else-if="alert.type === 'zero'"><CircleCloseFilled /></el-icon>
                <el-icon v-else><InfoFilled /></el-icon>
              </div>
              <div class="alert-content">
                <div class="alert-sku">{{ alert.sku }}</div>
                <div class="alert-desc">{{ alert.description }}</div>
              </div>
              <el-button type="primary" size="small" link @click="viewProduct(alert.sku)">
                处理
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷操作和数据上传 -->
    <div class="action-section">
      <div class="card quick-actions">
        <div class="card-header">
          <h3>
            <el-icon><Lightning /></el-icon>
            快捷操作
          </h3>
        </div>
        <div class="card-body">
          <div class="action-buttons">
            <div class="action-item" @click="goToUpload">
              <div class="action-icon upload">
                <el-icon><Upload /></el-icon>
              </div>
              <span>上传数据</span>
            </div>
            <div class="action-item" @click="goToOrders">
              <div class="action-icon orders">
                <el-icon><Tickets /></el-icon>
              </div>
              <span>查看订单</span>
            </div>
            <div class="action-item" @click="goToAlerts">
              <div class="action-icon alerts">
                <el-icon><Bell /></el-icon>
              </div>
              <span>处理预警</span>
            </div>
            <div class="action-item" @click="exportData">
              <div class="action-icon export">
                <el-icon><Download /></el-icon>
              </div>
              <span>导出报表</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card recent-uploads">
        <div class="card-header">
          <h3>
            <el-icon><Clock /></el-icon>
            最近上传记录
          </h3>
          <el-button type="primary" link @click="goToUploadLogs">查看全部</el-button>
        </div>
        <div class="card-body">
          <el-table :data="recentUploads" stripe style="width: 100%">
            <el-table-column prop="filename" label="文件名" min-width="180" show-overflow-tooltip />
            <el-table-column prop="module" label="模块" width="120">
              <template #default="{ row }">
                <el-tag :type="getModuleTagType(row.module)" size="small">
                  {{ getModuleText(row.module) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="successCount" label="成功" width="80" align="center">
              <template #default="{ row }">
                <span class="text-success">{{ row.successCount }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="failCount" label="失败" width="80" align="center">
              <template #default="{ row }">
                <span class="text-danger">{{ row.failCount }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="uploadTime" label="时间" width="160">
              <template #default="{ row }">
                {{ formatDateTime(row.uploadTime) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Goods, Box, TrendCharts, Money, CaretTop, CaretBottom,
  Upload, Download, Tickets, Bell, Warning, WarningFilled,
  CircleCloseFilled, InfoFilled, Top, Clock, Refresh, Lightning
} from '@element-plus/icons-vue'
import { apiService } from '@/utils/api.js'

const router = useRouter()

// 店铺相关
const shopList = ref([])
const selectedShopId = ref('')

const currentTime = computed(() => {
  const now = new Date()
  return now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
})

const stats = reactive({
  totalProducts: 0,
  activeProducts: 0,
  fbaAvailable: 0,
  fbaInbound: 0,
  sales7d: 0,
  salesAmount30d: 0
})

const topChartPeriod = ref('7d')

const topProducts = ref([])

const alerts = ref([])

const recentUploads = ref([])

const getRankColor = (index) => {
  const colors = ['#ff4d4f', '#fa8c16', '#faad14', '#52c41a', '#1890ff', '#722ed1', '#eb2f96', '#a0d911', '#13c2c2', '#fa541c']
  return colors[index] || '#d9d9d9'
}

const getModuleTagType = (module) => {
  const typeMap = {
    product: 'primary',
    order: 'success',
    fba_inventory: 'warning',
    fba_reserved: 'info',
    business: 'danger'
  }
  return typeMap[module] || 'info'
}

const getModuleText = (module) => {
  const textMap = {
    product: '商品库存',
    order: '订单',
    fba_inventory: 'FBA库存',
    fba_reserved: '预留库存',
    business: '业务报告'
  }
  return textMap[module] || module
}

const formatDateTime = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const refreshData = async () => {
  await loadStats()
  ElMessage.success('数据已刷新')
}

// 加载店铺列表
const loadShops = async () => {
  try {
    const shops = await apiService.shops.getAllShops()
    shopList.value = shops || []
  } catch (error) {
    console.error('获取店铺列表失败:', error)
  }
}

// 加载统计数据
const loadStats = async () => {
  try {
    const params = {}
    if (selectedShopId.value) {
      params.shop_id = selectedShopId.value
    }

    const [statsData, topData, alertsData, uploadsData] = await Promise.all([
      apiService.dashboard.getStats(params),
      apiService.dashboard.getTopProducts({ ...params, period: topChartPeriod.value }),
      apiService.dashboard.getAlerts(params),
      apiService.dashboard.getRecentUploads(params)
    ])

    Object.assign(stats, {
      totalProducts: statsData.totalProducts || 0,
      activeProducts: statsData.activeProducts || 0,
      fbaAvailable: statsData.fbaAvailable || 0,
      fbaInbound: statsData.fbaInbound || 0,
      sales7d: statsData.sales7d || 0,
      salesAmount30d: statsData.salesAmount30d || 0
    })

    topProducts.value = topData || []
    alerts.value = alertsData || []
    recentUploads.value = uploadsData || []
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

// 加载TOP商品
const loadTopProducts = async () => {
  try {
    const params = { period: topChartPeriod.value }
    if (selectedShopId.value) {
      params.shop_id = selectedShopId.value
    }
    const data = await apiService.dashboard.getTopProducts(params)
    topProducts.value = data || []
  } catch (error) {
    console.error('获取销量TOP10失败:', error)
  }
}

// 店铺变化时重新加载数据
const onShopChange = () => {
  loadStats()
}

// 监听时间维度变化
watch(topChartPeriod, () => {
  loadTopProducts()
})

const viewProduct = (sku) => {
  router.push(`/products/detail/${sku}`)
}

const goToUpload = () => {
  router.push('/products/upload')
}

const goToOrders = () => {
  router.push('/orders/1day')
}

const goToAlerts = () => {
  router.push('/fba/inventory')
}

const goToUploadLogs = () => {
  router.push('/admin/upload-logs')
}

const exportData = () => {
  ElMessage.info('导出功能开发中')
}

onMounted(() => {
  loadShops()
  loadStats()
})
</script>

<style scoped>
.dashboard-container {
  max-width: 1600px;
  margin: 0 auto;
}

/* 页面标题 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-content .page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1f1f1f;
  margin: 0 0 4px 0;
}

.header-content .page-subtitle {
  font-size: 14px;
  color: #8c8c8c;
  margin: 0;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: transform 0.3s, box-shadow 0.3s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
}

.stat-primary::before { background: linear-gradient(180deg, #409EFF, #36cfc9); }
.stat-success::before { background: linear-gradient(180deg, #52c41a, #b7d500); }
.stat-warning::before { background: linear-gradient(180deg, #fa8c16, #faad14); }
.stat-info::before { background: linear-gradient(180deg, #722ed1, #eb2f96); }

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.stat-primary .stat-icon { background: linear-gradient(135deg, #e6f4ff, #bae0ff); color: #409EFF; }
.stat-success .stat-icon { background: linear-gradient(135deg, #f6ffed, #d9f7be); color: #52c41a; }
.stat-warning .stat-icon { background: linear-gradient(135deg, #fff7e6, #ffd591); color: #fa8c16; }
.stat-info .stat-icon { background: linear-gradient(135deg, #f9f0ff, #efdbff); color: #722ed1; }

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-label {
  font-size: 14px;
  color: #8c8c8c;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1f1f1f;
  line-height: 1.2;
  margin-bottom: 8px;
}

.stat-desc {
  font-size: 13px;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.badge-success {
  background: #f6ffed;
  color: #52c41a;
}

.badge-warning {
  background: #fff7e6;
  color: #fa8c16;
}

.change-text {
  font-size: 12px;
}

.change-text.positive {
  color: #52c41a;
}

.change-text.negative {
  color: #ff4d4f;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
}

.stat-trend.trend-up {
  background: #f6ffed;
  color: #52c41a;
}

.stat-trend.trend-down {
  background: #fff1f0;
  color: #ff4d4f;
}

/* 内容网格 */
.content-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 20px;
  margin-bottom: 24px;
}

/* 卡片通用样式 */
.card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.card-header h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1f1f1f;
  margin: 0;
}

.card-body {
  padding: 16px 20px;
}

.empty-state {
  padding: 40px 0;
}

/* 产品列表 */
.product-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.product-item {
  display: grid;
  grid-template-columns: 40px 1fr auto 100px;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #fafafa;
  transition: background 0.3s;
}

.product-item:hover {
  background: #f0f0f0;
}

.product-rank {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  color: #fff;
}

.rank-1 { background: linear-gradient(135deg, #ff4d4f, #ff7875); }
.rank-2 { background: linear-gradient(135deg, #fa8c16, #ffa940); }
.rank-3 { background: linear-gradient(135deg, #faad14, #ffc53d); }
.rank-4, .rank-5, .rank-6, .rank-7, .rank-8, .rank-9, .rank-10 {
  background: #d9d9d9;
}

.product-info {
  min-width: 0;
}

.product-name {
  font-size: 14px;
  font-weight: 500;
  color: #1f1f1f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-sku {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 2px;
}

.product-stats {
  text-align: right;
}

.sales-count {
  font-size: 14px;
  font-weight: 600;
  color: #1f1f1f;
}

.sales-amount {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 2px;
}

/* 预警列表 */
.alert-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #fafafa;
  transition: background 0.3s;
}

.alert-item:hover {
  background: #f0f0f0;
}

.alert-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.alert-low .alert-icon {
  background: #fff7e6;
  color: #fa8c16;
}

.alert-zero .alert-icon {
  background: #fff1f0;
  color: #ff4d4f;
}

.alert-excess .alert-icon {
  background: #f9f0ff;
  color: #722ed1;
}

.alert-content {
  flex: 1;
  min-width: 0;
}

.alert-sku {
  font-size: 14px;
  font-weight: 500;
  color: #1f1f1f;
}

.alert-desc {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 2px;
}

/* 快捷操作区域 */
.action-section {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
}

.quick-actions .card-body {
  padding: 12px;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 12px;
  border-radius: 10px;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.3s;
}

.action-item:hover {
  background: linear-gradient(135deg, #e6f4ff, #bae0ff);
  transform: translateY(-2px);
}

.action-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.action-icon.upload { background: linear-gradient(135deg, #e6f4ff, #bae0ff); color: #409EFF; }
.action-icon.orders { background: linear-gradient(135deg, #f6ffed, #d9f7be); color: #52c41a; }
.action-icon.alerts { background: linear-gradient(135deg, #fff7e6, #ffd591); color: #fa8c16; }
.action-icon.export { background: linear-gradient(135deg, #f9f0ff, #efdbff); color: #722ed1; }

.action-item span {
  font-size: 13px;
  color: #1f1f1f;
  font-weight: 500;
}

/* 表格样式 */
.text-success {
  color: #52c41a;
  font-weight: 500;
}

.text-danger {
  color: #ff4d4f;
  font-weight: 500;
}

/* 响应式 */
@media (max-width: 1200px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .content-grid {
    grid-template-columns: 1fr;
  }

  .action-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }

  .product-item {
    grid-template-columns: 32px 1fr;
    gap: 8px;
  }

  .product-stats,
  .el-progress {
    display: none;
  }
}
</style>

<script>
import { defineComponent, h } from 'vue'

export default {
  filters: {
    formatNumber(value) {
      if (!value) return '0'
      return new Intl.NumberFormat('zh-CN').format(value)
    },
    formatCurrency(value) {
      if (!value) return '0.00'
      return new Intl.NumberFormat('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value)
    }
  }
}
</script>
