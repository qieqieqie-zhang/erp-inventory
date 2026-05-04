<template>
  <div class="order-list-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>{{ pageTitle }}</h2>
      <div class="header-actions">
        <el-button type="primary" :icon="Upload" @click="showUploadDialog">
          上传订单数据
        </el-button>
        <el-button :icon="Refresh" @click="refreshData">
          刷新
        </el-button>
        <el-button :icon="Download" @click="exportData">
          导出数据
        </el-button>
      </div>
    </div>

    <!-- 筛选条件 -->
    <el-card shadow="never" class="filter-card">
      <div class="filter-container">
        <el-form :model="filterForm" label-width="80px" :inline="true">
          <el-form-item label="SKU搜索">
            <el-input
              v-model="filterForm.sku"
              placeholder="输入SKU"
              clearable
              @keyup.enter="handleSearch"
              @clear="handleSearch"
            />
          </el-form-item>
          <el-form-item label="日期范围">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              @change="handleDateChange"
            />
          </el-form-item>
          <el-form-item label="订单状态">
            <el-select v-model="filterForm.status" placeholder="全部状态" clearable>
              <el-option label="全部" value="" />
              <el-option label="已完成" value="completed" />
              <el-option label="处理中" value="processing" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="resetFilter">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <!-- 数据统计 -->
    <div class="stats-container">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="never" class="stat-card">
            <div class="stat-item">
              <div class="stat-icon" style="background-color: #409EFF;">
                <el-icon><ShoppingCart /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.totalOrders || 0 }}</div>
                <div class="stat-label">订单总数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never" class="stat-card">
            <div class="stat-item">
              <div class="stat-icon" style="background-color: #67C23A;">
                <el-icon><Money /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">¥{{ formatCurrency(stats.totalRevenue || 0) }}</div>
                <div class="stat-label">销售总额</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never" class="stat-card">
            <div class="stat-item">
              <div class="stat-icon" style="background-color: #E6A23C;">
                <el-icon><Box /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.totalUnits || 0 }}</div>
                <div class="stat-label">销售数量</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never" class="stat-card">
            <div class="stat-item">
              <div class="stat-icon" style="background-color: #F56C6C;">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">¥{{ formatCurrency(stats.averageOrderValue || 0) }}</div>
                <div class="stat-label">客单价</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 数据表格 -->
    <el-card shadow="never" class="table-card">
      <el-table
        :data="orderList"
        v-loading="loading"
        style="width: 100%"
        stripe
        border
        @sort-change="handleSortChange"
      >
        <el-table-column prop="order_id" label="订单号" width="180" sortable />
        <el-table-column prop="sku" label="SKU" width="120" />
        <el-table-column prop="product_name_cn" label="中文名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="quantity" label="数量" width="100" align="center" />
        <el-table-column prop="unit_price" label="单价" width="120" align="right">
          <template #default="{ row }">
            ¥{{ formatCurrency(row.unit_price) }}
          </template>
        </el-table-column>
        <el-table-column prop="total_price" label="总价" width="120" align="right" sortable>
          <template #default="{ row }">
            ¥{{ formatCurrency(row.total_price) }}
          </template>
        </el-table-column>
        <el-table-column prop="order_date" label="下单时间" width="180" sortable>
          <template #default="{ row }">
            {{ formatDateTime(row.order_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="order_status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.order_status)">
              {{ getStatusText(row.order_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="shipping_country" label="国家" width="100" />
        <el-table-column prop="marketplace" label="站点" width="120" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="text" size="small" @click="viewDetail(row)">
              详情
            </el-button>
            <el-button type="text" size="small" @click="downloadInvoice(row)">
              发票
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[20, 50, 100, 200]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 上传对话框 -->
    <UploadDialog
      v-model="uploadDialogVisible"
      title="上传订单数据"
      accept=".xlsx,.xls,.csv,.txt"
      :show-shop-select="true"
      :show-dimension-select="true"
      :upload-fn="(fd) => apiService.orders.upload(uploadForm.dimension, fd)"
      upload-tip="支持 Excel、CSV、TXT 格式"
      @success="onUploadSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Upload,
  Refresh,
  Download,
  ShoppingCart,
  Money,
  Box,
  TrendCharts,
  UploadFilled
} from '@element-plus/icons-vue'
import { apiService } from '../../utils/api'
import UploadDialog from '@/components/UploadDialog.vue'

const route = useRoute()
const router = useRouter()

// 从路由参数获取时间维度
const dimension = computed(() => route.meta?.dimension || 'yesterday')

// 页面标题映射
const pageTitleMap = {
  'yesterday': '昨日订单',
  '3days': '近3天订单',
  '7days': '近7天订单',
  '14days': '近14天订单',
  '30days': '近30天订单'
}

const pageTitle = computed(() => pageTitleMap[dimension.value] || '订单列表')

// 数据状态
const loading = ref(false)
const orderList = ref([])
const stats = ref({})

// 筛选表单
const filterForm = ref({
  sku: '',
  status: '',
  startDate: '',
  endDate: ''
})

const dateRange = ref([])

// 分页配置
const pagination = ref({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 排序配置
const sortConfig = ref({
  prop: 'order_date',
  order: 'descending'
})

// 上传对话框
const uploadDialogVisible = ref(false)
const uploadLoading = ref(false)
const uploadForm = ref({
  dimension: dimension.value,
  file: null
})

// 店铺相关
const shopList = ref([])
const selectedShopId = ref('')

// 初始化加载数据
onMounted(() => {
  fetchOrderList()
  fetchOrderStats()
})

// 监听维度变化，重新加载数据
watch(dimension, () => {
  pagination.value.currentPage = 1
  fetchOrderList()
  fetchOrderStats()
})

// 获取订单列表
const fetchOrderList = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.currentPage,
      pageSize: pagination.value.pageSize,
      sku: filterForm.value.sku,
      status: filterForm.value.status,
      startDate: filterForm.value.startDate,
      endDate: filterForm.value.endDate,
      sortField: sortConfig.value.prop,
      sortOrder: sortConfig.value.order === 'descending' ? 'desc' : 'asc'
    }
    
    const data = await apiService.orders.getList(dimension.value, params)
    orderList.value = data.list || []
    pagination.value.total = data.total || 0
  } catch (error) {
    ElMessage.error(error.message || '获取订单列表失败')
    orderList.value = []
  } finally {
    loading.value = false
  }
}

// 获取订单统计
const fetchOrderStats = async () => {
  try {
    const data = await apiService.orders.getStats(dimension.value)
    stats.value = data || {}
  } catch (error) {
    console.error('获取订单统计失败:', error)
    stats.value = {}
  }
}

// 搜索处理
const handleSearch = () => {
  pagination.value.currentPage = 1
  fetchOrderList()
}

// 重置筛选
const resetFilter = () => {
  filterForm.value = {
    sku: '',
    status: '',
    startDate: '',
    endDate: ''
  }
  dateRange.value = []
  pagination.value.currentPage = 1
  fetchOrderList()
}

// 日期范围变化处理
const handleDateChange = (dates) => {
  if (dates && dates.length === 2) {
    filterForm.value.startDate = dates[0]
    filterForm.value.endDate = dates[1]
  } else {
    filterForm.value.startDate = ''
    filterForm.value.endDate = ''
  }
}

// 分页处理
const handleSizeChange = (size) => {
  pagination.value.pageSize = size
  pagination.value.currentPage = 1
  fetchOrderList()
}

const handleCurrentChange = (page) => {
  pagination.value.currentPage = page
  fetchOrderList()
}

// 排序处理
const handleSortChange = ({ prop, order }) => {
  sortConfig.value = { prop, order }
  fetchOrderList()
}

// 刷新数据
const refreshData = () => {
  fetchOrderList()
  fetchOrderStats()
}

// 导出数据
const exportData = async () => {
  try {
    loading.value = true
    const blob = await apiService.orders.exportData(dimension.value, 'excel')
    
    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${pageTitle.value}_导出_${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error(error.message || '导出失败')
  } finally {
    loading.value = false
  }
}

// 查看详情
const viewDetail = (row) => {
  // 跳转到订单详情页
  router.push(`/orders/detail/${row.order_id}`)
}

// 下载发票
const downloadInvoice = (row) => {
  ElMessage.info('发票下载功能开发中')
}

// 上传相关方法
const showUploadDialog = () => {
  uploadForm.value.dimension = dimension.value
  uploadDialogVisible.value = true
}

const onUploadSuccess = () => {
  fetchOrderList()
  fetchOrderStats()
}

// 工具方法
const formatCurrency = (value) => {
  if (value === undefined || value === null) return '0.00'
  return parseFloat(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const formatDateTime = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const getStatusType = (status) => {
  const s = (status || '').toLowerCase()
  const typeMap = {
    completed: 'success',
    shipped: 'success',
    processing: 'primary',
    pending: 'warning',
    cancelled: 'danger'
  }
  return typeMap[s] || 'info'
}

const getStatusText = (status) => {
  const s = (status || '').toLowerCase()
  const textMap = {
    completed: '已完成',
    shipped: '已发货',
    processing: '处理中',
    pending: '待处理',
    cancelled: '已取消'
  }
  return textMap[s] || status
}
</script>

<style scoped>
.order-list-container {
  padding: 20px;
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
  font-size: 24px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-container {
  padding: 20px;
}

.stats-container {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  padding: 20px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  color: white;
  font-size: 24px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  line-height: 1.2;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.table-card {
  margin-bottom: 20px;
}

.pagination-container {
  padding: 20px 0;
  text-align: right;
}

.upload-demo {
  :deep(.el-upload-dragger) {
    width: 100%;
  }
}

.preview-section {
  width: 100%;
}

.preview-card {
  border: 1px solid #ebeef5;
  background-color: #fafafa;
}

.file-info {
  font-size: 13px;
  color: #606266;
  padding: 10px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.preview-content {
  margin-top: 15px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }
  
  .filter-container .el-form-item {
    margin-bottom: 10px;
  }
  
  .stat-item {
    flex-direction: column;
    text-align: center;
    padding: 16px;
  }
  
  .stat-icon {
    margin-right: 0;
    margin-bottom: 12px;
  }
}

/* 店铺选择样式 */
.shop-select-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.shop-select-section .el-form-item {
  margin-bottom: 0;
}

.shop-tip {
  margin-left: 12px;
  color: #909399;
  font-size: 12px;
}
</style>