<template>
  <div class="fba-reserved-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>FBA预留库存管理</h2>
      <div class="header-actions">
        <el-button type="primary" :icon="Upload" @click="uploadDialogVisible = true">
          上传预留库存报告
        </el-button>
        <el-button :icon="Refresh" @click="refreshData">
          刷新
        </el-button>
        <el-button type="success" :icon="Download" @click="exportData">
          导出数据
        </el-button>
        <el-button :icon="View" @click="viewAlerts">
          库存预警
        </el-button>
      </div>
    </div>

    <!-- 数据统计 -->
    <div class="data-statistics">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="never" class="stat-card total-reserved">
            <div class="stat-item">
              <div class="stat-icon">
                <el-icon><Box /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-label">总预留库存</div>
                <div class="stat-value">{{ formatNumber(stats.totalReserved) }}</div>
                <div class="stat-unit">件</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never" class="stat-card customer-orders">
            <div class="stat-item">
              <div class="stat-icon">
                <el-icon><ShoppingCart /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-label">客户订单预留</div>
                <div class="stat-value">{{ formatNumber(stats.customerOrders) }}</div>
                <div class="stat-unit">件</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never" class="stat-card transfer-in">
            <div class="stat-item">
              <div class="stat-icon">
                <el-icon><Truck /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-label">入库中转预留</div>
                <div class="stat-value">{{ formatNumber(stats.transferIn) }}</div>
                <div class="stat-unit">件</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never" class="stat-card transfer-out">
            <div class="stat-item">
              <div class="stat-icon">
                <el-icon><Ship /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-label">出库中转预留</div>
                <div class="stat-value">{{ formatNumber(stats.transferOut) }}</div>
                <div class="stat-unit">件</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 数据表格 -->
    <el-card class="data-table-card">
      <div class="table-header">
        <h3>FBA预留库存列表</h3>
        <div class="table-actions">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索SKU/品名/仓库"
            class="search-input"
            :prefix-icon="Search"
            clearable
          />
          <el-select v-model="filterType" placeholder="筛选预留类型" class="filter-select">
            <el-option label="全部类型" value="" />
            <el-option label="客户订单预留" value="customer_orders" />
            <el-option label="入库中转预留" value="transfer_in" />
            <el-option label="出库中转预留" value="transfer_out" />
          </el-select>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </div>
      </div>

      <el-table :data="filteredReservedData" v-loading="loading" border stripe>
        <el-table-column prop="sku" label="SKU" width="120" fixed />
        <el-table-column prop="product_name" label="品名" min-width="180" />
        <el-table-column prop="fnsku" label="FNSKU" width="130" />
        <el-table-column prop="fulfillment_center" label="履约中心" width="140" />
        <el-table-column prop="reserved_type" label="预留类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getReservedTypeTag(row.reserved_type)">
              {{ getReservedTypeText(row.reserved_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="预留数量" width="100" align="center">
          <template #default="{ row }">
            <span class="quantity-cell">{{ formatNumber(row.quantity) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="latest_update_date" label="最后更新日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.latest_update_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="expected_release_date" label="预计释放日期" width="120">
          <template #default="{ row }">
            <span v-if="row.expected_release_date" class="release-date">
              {{ formatDate(row.expected_release_date) }}
            </span>
            <span v-else class="no-date">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" :icon="View" @click="viewDetails(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalCount"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 上传对话框 -->
    <UploadDialog
      v-model="uploadDialogVisible"
      title="上传FBA预留库存报告"
      accept=".xlsx,.xls,.csv,.txt"
      :show-shop-select="true"
      :upload-fn="apiService.fba.reserved.upload"
      upload-tip="支持 Excel、CSV、TXT 格式"
      @success="refreshData"
    />

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialogVisible" :title="currentDetail?.sku + ' - 预留库存详情'" width="600">
      <div class="detail-container" v-if="currentDetail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="SKU">{{ currentDetail.sku }}</el-descriptions-item>
          <el-descriptions-item label="FNSKU">{{ currentDetail.fnsku }}</el-descriptions-item>
          <el-descriptions-item label="品名">{{ currentDetail.product_name }}</el-descriptions-item>
          <el-descriptions-item label="ASIN">{{ currentDetail.asin || '-' }}</el-descriptions-item>
          <el-descriptions-item label="预留类型">{{ getReservedTypeText(currentDetail.reserved_type) }}</el-descriptions-item>
          <el-descriptions-item label="预留数量">{{ formatNumber(currentDetail.quantity) }}</el-descriptions-item>
          <el-descriptions-item label="履约中心">{{ currentDetail.fulfillment_center }}</el-descriptions-item>
          <el-descriptions-item label="国家代码">{{ currentDetail.country_code || 'US' }}</el-descriptions-item>
          <el-descriptions-item label="最后更新">{{ formatDate(currentDetail.latest_update_date) }}</el-descriptions-item>
          <el-descriptions-item label="预计释放">{{ formatDate(currentDetail.expected_release_date) }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentDetail.remarks || '无' }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Box,
  ShoppingCart,
  Van,
  Place,
  Upload,
  Refresh,
  Download,
  View,
  Search,
  Loading
} from '@element-plus/icons-vue'
import { apiService } from '../../utils/api.js'
import UploadDialog from '@/components/UploadDialog.vue'

const router = useRouter()

// 数据状态
const loading = ref(false)
const searchKeyword = ref('')
const filterType = ref('')
const dateRange = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const totalCount = ref(0)

// 对话框状态
const uploadDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const currentDetail = ref(null)

// 店铺相关
const shopList = ref([])
const selectedShopId = ref('')

// 统计数据和表格数据
const stats = ref({
  totalReserved: 0,
  customerOrders: 0,
  transferIn: 0,
  transferOut: 0
})

const reservedData = ref([])

// 计算属性
const filteredReservedData = computed(() => {
  let filtered = reservedData.value
  
  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(
      item => 
        item.sku?.toLowerCase().includes(keyword) ||
        item.product_name?.toLowerCase().includes(keyword) ||
        item.fulfillment_center?.toLowerCase().includes(keyword)
    )
  }
  
  // 类型筛选
  if (filterType.value) {
    filtered = filtered.filter(item => item.reserved_type === filterType.value)
  }
  
  // 日期筛选
  if (dateRange.value && dateRange.value.length === 2) {
    const [start, end] = dateRange.value
    filtered = filtered.filter(item => {
      const date = item.latest_update_date
      return date >= start && date <= end
    })
  }
  
  // 分页
  const startIndex = (currentPage.value - 1) * pageSize.value
  return filtered.slice(startIndex, startIndex + pageSize.value)
})

// 辅助函数
const formatNumber = (num) => {
  return num?.toLocaleString() || '0'
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

const getReservedTypeTag = (type) => {
  const map = {
    'customer_orders': 'primary',
    'transfer_in': 'success',
    'transfer_out': 'warning'
  }
  return map[type] || 'info'
}

const getReservedTypeText = (type) => {
  const map = {
    'customer_orders': '客户订单预留',
    'transfer_in': '入库中转预留',
    'transfer_out': '出库中转预留'
  }
  return map[type] || type
}

const getStatusTag = (status) => {
  const map = {
    'active': 'success',
    'pending': 'warning',
    'released': 'info'
  }
  return map[status] || ''
}

const getStatusText = (status) => {
  const map = {
    'active': '有效',
    'pending': '待释放',
    'released': '已释放'
  }
  return map[status] || status
}

// 数据操作
const refreshData = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value,
      type: filterType.value
    }

    const data = await apiService.fba.reserved.getList(params)
    reservedData.value = data.list || []
    totalCount.value = data.pagination?.total || 0

    // 更新统计数据
    const statsData = await apiService.fba.reserved.getStats()
    Object.assign(stats.value, statsData)

    ElMessage.success('数据已刷新')
  } catch (error) {
    console.error('刷新数据失败:', error)
    ElMessage.error('刷新数据失败')
  } finally {
    loading.value = false
  }
}

const exportData = () => {
  ElMessage.info('导出功能开发中...')
  // TODO: 实现导出功能
}

const viewAlerts = () => {
  ElMessage.info('库存预警功能开发中...')
  // TODO: 实现预警功能
}

const viewDetails = (row) => {
  currentDetail.value = row
  detailDialogVisible.value = true
}

// 分页处理
const handleSizeChange = (newSize) => {
  pageSize.value = newSize
  currentPage.value = 1
  refreshData()
}

const handleCurrentChange = (newPage) => {
  currentPage.value = newPage
  refreshData()
}

// 生命周期
onMounted(() => {
  refreshData()
})

</script>

<style scoped>
.fba-reserved-container {
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

.data-statistics {
  margin-bottom: 20px;
}

.stat-card {
  height: 120px;
  border-radius: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
  color: white;
}

.total-reserved .stat-icon {
  background-color: #409EFF;
}

.customer-orders .stat-icon {
  background-color: #67C23A;
}

.transfer-in .stat-icon {
  background-color: #E6A23C;
}

.transfer-out .stat-icon {
  background-color: #F56C6C;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.stat-unit {
  font-size: 12px;
  color: #909399;
}

.data-table-card {
  margin-top: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.table-header h3 {
  margin: 0;
  color: #303133;
}

.table-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-input {
  width: 250px;
}

.filter-select {
  width: 150px;
}

.quantity-cell {
  font-weight: bold;
  color: #409EFF;
}

.release-date {
  color: #67C23A;
}

.no-date {
  color: #909399;
  font-style: italic;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.upload-dialog {
  text-align: center;
}

.upload-area {
  margin: 20px 0;
}

.detail-container {
  line-height: 1.6;
}

.el-button {
  margin-right: 10px;
}

.el-button:last-child {
  margin-right: 0;
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