<template>
  <div class="fba-reserved-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>FBA预留库存管理</h2>
      <div class="header-actions">
        <el-button type="primary" :icon="Upload" @click="showUploadDialog">
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

    <!-- 库存概览 -->
    <div class="inventory-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="never" class="overview-card total-inventory">
            <div class="overview-item">
              <div class="overview-icon">
                <el-icon><Box /></el-icon>
              </div>
              <div class="overview-content">
                <div class="overview-value">{{ formatNumber(overviewData.totalReserved || 0) }}</div>
                <div class="overview-label">总预留库存</div>
                <div class="overview-change">
                  <span class="overview-hint">件</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card shadow="never" class="overview-card customer-orders">
            <div class="overview-item">
              <div class="overview-icon">
                <el-icon><ShoppingCart /></el-icon>
              </div>
              <div class="overview-content">
                <div class="overview-value">{{ formatNumber(overviewData.customerOrders || 0) }}</div>
                <div class="overview-label">客户订单预留</div>
                <div class="overview-change">
                  <span class="overview-hint">件</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card shadow="never" class="overview-card transfer-in">
            <div class="overview-item">
              <div class="overview-icon">
                <el-icon><Truck /></el-icon>
              </div>
              <div class="overview-content">
                <div class="overview-value">{{ formatNumber(overviewData.transferIn || 0) }}</div>
                <div class="overview-label">入库中转预留</div>
                <div class="overview-change">
                  <span class="overview-hint">件</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card shadow="never" class="overview-card transfer-out">
            <div class="overview-item">
              <div class="overview-icon">
                <el-icon><Ship /></el-icon>
              </div>
              <div class="overview-content">
                <div class="overview-value">{{ formatNumber(overviewData.transferOut || 0) }}</div>
                <div class="overview-label">出库中转预留</div>
                <div class="overview-change">
                  <span class="overview-hint">件</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
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
          <el-form-item label="商品名称">
            <el-input
              v-model="filterForm.productName"
              placeholder="输入商品名称"
              clearable
              @keyup.enter="handleSearch"
              @clear="handleSearch"
            />
          </el-form-item>
          <el-form-item label="预留类型">
            <el-select v-model="filterForm.reservedType" placeholder="全部类型" clearable>
              <el-option label="全部" value="" />
              <el-option label="客户订单预留" value="customer_orders" />
              <el-option label="入库中转预留" value="transfer_in" />
              <el-option label="出库中转预留" value="transfer_out" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="filterForm.status" placeholder="全部状态" clearable>
              <el-option label="全部" value="" />
              <el-option label="有效" value="active" />
              <el-option label="待释放" value="pending" />
              <el-option label="已释放" value="released" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="resetFilter">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <!-- 数据表格 -->
    <el-card shadow="never" class="table-card">
      <div class="table-toolbar">
        <div class="toolbar-left">
          <span class="total-count">共 {{ pagination.total }} 条记录</span>
        </div>
        <div class="toolbar-right">
          <el-button-group>
            <el-button size="small" :type="viewMode === 'table' ? 'primary' : ''" @click="viewMode = 'table'">
              <el-icon><Grid /></el-icon> 表格
            </el-button>
            <el-button size="small" :type="viewMode === 'card' ? 'primary' : ''" @click="viewMode = 'card'">
              <el-icon><Menu /></el-icon> 卡片
            </el-button>
          </el-button-group>
        </div>
      </div>

      <!-- 表格视图 -->
      <div v-show="viewMode === 'table'">
        <el-table
          :data="inventoryList"
          v-loading="loading"
          style="width: 100%"
          stripe
          border
          @sort-change="handleSortChange"
        >
          <el-table-column prop="sku" label="SKU" width="120" sortable fixed />
          <el-table-column prop="product_name" label="商品名称" min-width="200" show-overflow-tooltip />
          <el-table-column prop="fnsku" label="FNSKU" width="130" />
          <el-table-column prop="asin" label="ASIN" width="120" />
          <el-table-column prop="total_reserved" label="总预留数量" width="110" align="center" sortable>
            <template #default="{ row }">
              <el-tag size="small" type="warning">{{ formatNumber(row.total_reserved || 0) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="reserved_type" label="预留类型" width="120">
            <template #default="{ row }">
              <el-tag size="small" :type="getReservedTypeTag(row.reserved_type)">
                {{ getReservedTypeText(row.reserved_type) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="fulfillment_center" label="履约中心" width="140" />
          <el-table-column prop="country_code" label="国家" width="80">
            <template #default="{ row }">
              {{ row.country_code || 'US' }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="getStatusTag(row.status)">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="latest_update_date" label="最后更新" width="160" sortable>
            <template #default="{ row }">
              {{ formatDateTime(row.latest_update_date) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button type="text" size="small" @click="viewDetails(row)">
                详情
              </el-button>
              <el-dropdown @command="(command) => handleMoreCommand(row, command)" trigger="click">
                <el-button type="text" size="small">
                  更多 <el-icon><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="history">历史记录</el-dropdown-item>
                    <el-dropdown-item command="export" divided>导出</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 卡片视图 -->
      <div v-show="viewMode === 'card'" class="card-view">
        <el-row :gutter="20">
          <el-col
            v-for="item in inventoryList"
            :key="item.sku"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
            :xl="4"
          >
            <el-card shadow="hover" class="inventory-card">
              <template #header>
                <div class="card-header">
                  <div class="sku">{{ item.sku }}</div>
                  <el-tag size="small" :type="getStatusTag(item.status)">
                    {{ getStatusText(item.status) }}
                  </el-tag>
                </div>
              </template>

              <div class="card-content">
                <div class="product-name">{{ item.product_name || '-' }}</div>

                <div class="inventory-stats">
                  <div class="stat-item">
                    <span class="stat-label">总预留:</span>
                    <span class="stat-value">{{ formatNumber(item.total_reserved || 0) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">类型:</span>
                    <span class="stat-value">{{ getReservedTypeText(item.reserved_type) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">履约中心:</span>
                    <span class="stat-value">{{ item.fulfillment_center || '-' }}</span>
                  </div>
                </div>

                <div class="additional-info">
                  <div class="info-item">
                    <el-icon><Location /></el-icon>
                    <span>{{ item.country_code || 'US' }}</span>
                  </div>
                  <div class="info-item">
                    <el-icon><Clock /></el-icon>
                    <span>更新: {{ formatDateTime(item.latest_update_date) }}</span>
                  </div>
                </div>
              </div>

              <div class="card-actions">
                <el-button type="text" size="small" @click="viewDetails(item)">
                  详情
                </el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

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
      title="上传FBA预留库存报告"
      :accept="'.xlsx,.xls,.csv,.txt'"
      :max-size="10"
      :show-shop-select="true"
      :upload-fn="apiService.fba.reserved.upload"
      @success="handleUploadSuccess"
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
          <el-descriptions-item label="预留数量">{{ formatNumber(currentDetail.total_reserved) }}</el-descriptions-item>
          <el-descriptions-item label="履约中心">{{ currentDetail.fulfillment_center }}</el-descriptions-item>
          <el-descriptions-item label="国家代码">{{ currentDetail.country_code || 'US' }}</el-descriptions-item>
          <el-descriptions-item label="最后更新">{{ formatDateTime(currentDetail.latest_update_date) }}</el-descriptions-item>
          <el-descriptions-item label="预计释放">{{ formatDateTime(currentDetail.expected_release_date) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag size="small" :type="getStatusTag(currentDetail.status)">
              {{ getStatusText(currentDetail.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentDetail.remarks || '无' }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 库存预警对话框 -->
    <el-dialog v-model="alertsDialogVisible" title="库存预警" width="800px">
      <InventoryAlerts @close="alertsDialogVisible = false" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Upload,
  Refresh,
  Download,
  View,
  Box,
  ShoppingCart,
  Truck,
  Ship,
  Grid,
  Menu,
  ArrowDown,
  Location,
  Clock
} from '@element-plus/icons-vue'
import { apiService } from '../../utils/api'
import UploadDialog from '../../components/UploadDialog.vue'
import InventoryAlerts from './components/InventoryAlerts.vue'

// 数据状态
const loading = ref(false)
const inventoryList = ref([])
const overviewData = ref({})

// 视图模式
const viewMode = ref('table')

// 筛选表单
const filterForm = ref({
  sku: '',
  productName: '',
  reservedType: '',
  status: ''
})

// 分页配置
const pagination = ref({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 排序配置
const sortConfig = ref({
  prop: 'latest_update_date',
  order: 'descending'
})

// 对话框控制
const uploadDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const alertsDialogVisible = ref(false)
const currentDetail = ref(null)

// 初始化加载数据
onMounted(() => {
  fetchInventoryList()
  fetchOverviewData()
})

// 获取库存列表
const fetchInventoryList = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.currentPage,
      pageSize: pagination.value.pageSize,
      keyword: filterForm.value.sku || filterForm.value.productName,
      type: filterForm.value.reservedType,
      status: filterForm.value.status,
      sortField: sortConfig.value.prop,
      sortOrder: sortConfig.value.order === 'descending' ? 'desc' : 'asc'
    }

    const data = await apiService.fba.reserved.getList(params)
    inventoryList.value = data.list || []
    pagination.value.total = data.pagination?.total || 0
  } catch (error) {
    ElMessage.error(error.message || '获取预留库存列表失败')
    inventoryList.value = []
  } finally {
    loading.value = false
  }
}

// 获取概览数据
const fetchOverviewData = async () => {
  try {
    const data = await apiService.fba.reserved.getStats()
    overviewData.value = data || {}
  } catch (error) {
    console.error('获取概览数据失败:', error)
    overviewData.value = {
      totalReserved: 0,
      customerOrders: 0,
      transferIn: 0,
      transferOut: 0
    }
  }
}

// 搜索处理
const handleSearch = () => {
  pagination.value.currentPage = 1
  fetchInventoryList()
}

// 重置筛选
const resetFilter = () => {
  filterForm.value = {
    sku: '',
    productName: '',
    reservedType: '',
    status: ''
  }
  pagination.value.currentPage = 1
  fetchInventoryList()
}

// 分页处理
const handleSizeChange = (size) => {
  pagination.value.pageSize = size
  pagination.value.currentPage = 1
  fetchInventoryList()
}

const handleCurrentChange = (page) => {
  pagination.value.currentPage = page
  fetchInventoryList()
}

// 排序处理
const handleSortChange = ({ prop, order }) => {
  sortConfig.value = { prop, order }
  fetchInventoryList()
}

// 刷新数据
const refreshData = () => {
  fetchInventoryList()
  fetchOverviewData()
}

// 导出数据
const exportData = async () => {
  try {
    loading.value = true
    ElMessage.info('导出功能开发中...')
  } catch (error) {
    ElMessage.error(error.message || '导出失败')
  } finally {
    loading.value = false
  }
}

// 查看预警
const viewAlerts = () => {
  alertsDialogVisible.value = true
}

// 上传成功后刷新数据
const handleUploadSuccess = () => {
  fetchInventoryList()
  fetchOverviewData()
}

// 查看详情
const viewDetails = (row) => {
  currentDetail.value = row
  detailDialogVisible.value = true
}

const handleMoreCommand = (row, command) => {
  switch (command) {
    case 'history':
      ElMessage.info('历史记录功能开发中')
      break
    case 'export':
      exportItem(row)
      break
  }
}

const exportItem = (row) => {
  const data = JSON.stringify(row, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `FBA预留_${row.sku}_${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
  ElMessage.success('导出成功')
}

// 工具方法
const formatNumber = (num) => {
  return num?.toLocaleString() || '0'
}

const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
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
  return map[type] || type || '-'
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
  return map[status] || status || '-'
}

const showUploadDialog = () => {
  uploadDialogVisible.value = true
}
</script>

<style scoped>
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

.inventory-overview {
  margin-bottom: 20px;
}

.overview-card {
  border-radius: 8px;
  border: none;
}

.overview-card.total-inventory .overview-icon {
  background: linear-gradient(135deg, #409EFF, #79BBFF);
}

.overview-card.customer-orders .overview-icon {
  background: linear-gradient(135deg, #67C23A, #95D475);
}

.overview-card.transfer-in .overview-icon {
  background: linear-gradient(135deg, #E6A23C, #F3D19E);
}

.overview-card.transfer-out .overview-icon {
  background: linear-gradient(135deg, #F56C6C, #F89898);
}

.overview-item {
  display: flex;
  align-items: center;
  padding: 16px;
}

.overview-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  color: white;
  font-size: 20px;
}

.overview-content {
  flex: 1;
}

.overview-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  line-height: 1.2;
  margin-bottom: 4px;
}

.overview-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.overview-change {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.overview-hint {
  color: #C0C4CC;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-container {
  padding: 20px;
}

.table-card {
  margin-bottom: 20px;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.total-count {
  color: #606266;
  font-size: 14px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-view {
  margin-top: 20px;
}

.inventory-card {
  margin-bottom: 20px;
  transition: all 0.3s;
}

.inventory-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sku {
  font-weight: bold;
  color: #303133;
}

.card-content {
  padding: 4px 0;
}

.product-name {
  font-size: 14px;
  color: #606266;
  margin-bottom: 12px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.inventory-stats {
  margin-bottom: 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 12px;
}

.stat-label {
  color: #909399;
}

.stat-value {
  color: #303133;
  font-weight: 500;
}

.additional-info {
  border-top: 1px solid #EBEEF5;
  padding-top: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
  color: #606266;
}

.info-item .el-icon {
  margin-right: 6px;
  font-size: 14px;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.pagination-container {
  padding: 20px 0;
  text-align: right;
}

.detail-container {
  line-height: 1.6;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .overview-item {
    flex-direction: column;
    text-align: center;
    padding: 12px;
  }

  .overview-icon {
    margin-right: 0;
    margin-bottom: 12px;
  }

  .table-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .toolbar-right {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
