<template>
  <div class="upload-logs-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>上传日志管理</h2>
      <div class="header-actions">
        <el-button :icon="Refresh" @click="refreshData">
          刷新
        </el-button>
        <el-button type="success" :icon="Download" @click="exportData">
          导出日志
        </el-button>
        <el-button type="warning" :icon="Delete" @click="clearOldLogs">
          清理旧日志
        </el-button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="never" class="stats-card total-uploads">
            <div class="stats-item">
              <div class="stats-icon">
                <el-icon><Upload /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-label">总上传次数</div>
                <div class="stats-value">{{ formatNumber(stats.totalUploads) }}</div>
                <div class="stats-unit">次</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never" class="stats-card success-uploads">
            <div class="stats-item">
              <div class="stats-icon">
                <el-icon><CircleCheck /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-label">成功上传</div>
                <div class="stats-value">{{ formatNumber(stats.successUploads) }}</div>
                <div class="stats-unit">次</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never" class="stats-card failed-uploads">
            <div class="stats-item">
              <div class="stats-icon">
                <el-icon><CircleClose /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-label">失败上传</div>
                <div class="stats-value">{{ formatNumber(stats.failedUploads) }}</div>
                <div class="stats-unit">次</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never" class="stats-card total-data">
            <div class="stats-item">
              <div class="stats-icon">
                <el-icon><DataLine /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-label">总处理数据</div>
                <div class="stats-value">{{ formatNumber(stats.totalData) }}</div>
                <div class="stats-unit">条</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 搜索和筛选 -->
    <el-card class="filter-card">
      <div class="filter-content">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索文件名/上传者/模块"
          class="search-input"
          :prefix-icon="Search"
          clearable
        />
        <el-select v-model="filterModule" placeholder="筛选模块" class="module-select">
          <el-option label="全部模块" value="" />
          <el-option label="商品库存" value="product" />
          <el-option label="订单数据" value="order" />
          <el-option label="FBA库存" value="fba_inventory" />
          <el-option label="FBA预留库存" value="fba_reserved" />
          <el-option label="业务报告" value="business_report" />
        </el-select>
        <el-select v-model="filterStatus" placeholder="状态筛选" class="status-select">
          <el-option label="全部状态" value="" />
          <el-option label="成功" value="success" />
          <el-option label="失败" value="failed" />
          <el-option label="处理中" value="processing" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
        />
        <el-button type="primary" :icon="Search" @click="handleSearch">
          搜索
        </el-button>
        <el-button @click="resetFilters">
          重置
        </el-button>
      </div>
    </el-card>

    <!-- 上传日志表格 -->
    <el-card class="logs-table-card">
      <el-table :data="filteredLogs" v-loading="loading" border stripe>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="upload_time" label="上传时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.upload_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="module" label="模块" width="120">
          <template #default="{ row }">
            <el-tag :type="getModuleTag(row.module)">
              {{ getModuleText(row.module) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="filename" label="文件名" width="180">
          <template #default="{ row }">
            <span class="filename-cell">{{ row.filename }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="upload_by" label="上传者" width="120" />
        <el-table-column prop="total_records" label="总记录数" width="100" align="center">
          <template #default="{ row }">
            {{ formatNumber(row.total_records) }}
          </template>
        </el-table-column>
        <el-table-column prop="success_records" label="成功数" width="100" align="center">
          <template #default="{ row }">
            <span class="success-count">{{ formatNumber(row.success_records) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="failed_records" label="失败数" width="100" align="center">
          <template #default="{ row }">
            <span v-if="row.failed_records > 0" class="failed-count">
              {{ formatNumber(row.failed_records) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="error_message" label="错误信息" min-width="200">
          <template #default="{ row }">
            <span v-if="row.error_message" class="error-message">
              {{ row.error_message }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" :icon="View" @click="viewLogDetails(row)">
              详情
            </el-button>
            <el-popconfirm
              v-if="row.status !== 'processing'"
              :title="row.failed_records > 0 ? '删除日志及错误文件?' : '确认删除此日志?'"
              @confirm="deleteLog(row.id)"
            >
              <template #reference>
                <el-button type="danger" size="small" :icon="Delete">
                  删除
                </el-button>
              </template>
            </el-popconfirm>
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

    <!-- 日志详情对话框 -->
    <el-dialog 
      v-model="detailDialogVisible" 
      :title="`上传日志详情 - ${currentLog?.filename}`" 
      width="700"
    >
      <div class="log-detail-container" v-if="currentLog">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="日志ID">{{ currentLog.id }}</el-descriptions-item>
          <el-descriptions-item label="上传时间">{{ formatDateTime(currentLog.upload_time) }}</el-descriptions-item>
          <el-descriptions-item label="文件名称">{{ currentLog.filename }}</el-descriptions-item>
          <el-descriptions-item label="文件大小">{{ formatFileSize(currentLog.file_size) }}</el-descriptions-item>
          <el-descriptions-item label="上传模块">{{ getModuleText(currentLog.module) }}</el-descriptions-item>
          <el-descriptions-item label="上传者">{{ currentLog.upload_by }}</el-descriptions-item>
          <el-descriptions-item label="总记录数">{{ formatNumber(currentLog.total_records) }}</el-descriptions-item>
          <el-descriptions-item label="成功记录">{{ formatNumber(currentLog.success_records) }}</el-descriptions-item>
          <el-descriptions-item label="失败记录">{{ formatNumber(currentLog.failed_records) }}</el-descriptions-item>
          <el-descriptions-item label="处理状态">{{ getStatusText(currentLog.status) }}</el-descriptions-item>
          <el-descriptions-item label="耗时">{{ currentLog.processing_time || '未记录' }}</el-descriptions-item>
          <el-descriptions-item label="IP地址">{{ currentLog.ip_address || '未记录' }}</el-descriptions-item>
          <el-descriptions-item label="文件路径" :span="2">
            {{ currentLog.file_path || '未记录' }}
          </el-descriptions-item>
          <el-descriptions-item label="错误信息" :span="2">
            <div v-if="currentLog.error_message" class="error-detail">
              <pre>{{ currentLog.error_message }}</pre>
            </div>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="失败数据文件" :span="2">
            <div v-if="currentLog.error_file_path">
              <el-link type="primary" :href="`/api${currentLog.error_file_path}`" target="_blank">
                下载错误文件
              </el-link>
            </div>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">
            {{ currentLog.remarks || '无' }}
          </el-descriptions-item>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh,
  Download,
  Delete,
  Search,
  View,
  Upload,
  CircleCheck,
  CircleClose,
  DataLine
} from '@element-plus/icons-vue'

// 数据状态
const loading = ref(false)
const searchKeyword = ref('')
const filterModule = ref('')
const filterStatus = ref('')
const dateRange = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const totalCount = ref(0)

// 对话框状态
const detailDialogVisible = ref(false)
const currentLog = ref(null)

// 统计数据
const stats = ref({
  totalUploads: 128,
  successUploads: 118,
  failedUploads: 10,
  totalData: 15680
})

// 模拟日志数据
const uploadLogs = ref([
  {
    id: 1,
    upload_time: '2024-03-15 10:30:25',
    module: 'product',
    filename: '商品库存_20240315.xlsx',
    upload_by: 'admin',
    total_records: 256,
    success_records: 250,
    failed_records: 6,
    file_size: 1024 * 78, // 78KB
    status: 'success',
    error_message: '',
    processing_time: '3.5秒',
    ip_address: '192.168.1.100',
    file_path: '/uploads/product_20240315.xlsx',
    error_file_path: null,
    remarks: '商品库存数据上传'
  },
  {
    id: 2,
    upload_time: '2024-03-15 09:15:42',
    module: 'order',
    filename: '订单数据_20240314.csv',
    upload_by: 'sales',
    total_records: 1245,
    success_records: 1245,
    failed_records: 0,
    file_size: 1024 * 356, // 356KB
    status: 'success',
    error_message: '',
    processing_time: '8.2秒',
    ip_address: '192.168.1.150',
    file_path: '/uploads/order_20240314.csv',
    error_file_path: null,
    remarks: '昨日订单数据'
  },
  {
    id: 3,
    upload_time: '2024-03-14 16:20:18',
    module: 'fba_inventory',
    filename: 'FBA库存报告.xlsx',
    upload_by: 'warehouse',
    total_records: 89,
    success_records: 89,
    failed_records: 0,
    file_size: 1024 * 145, // 145KB
    status: 'success',
    error_message: '',
    processing_time: '2.1秒',
    ip_address: '192.168.1.120',
    file_path: '/uploads/fba_inventory_20240314.xlsx',
    error_file_path: null,
    remarks: 'FBA周库存报告'
  },
  {
    id: 4,
    upload_time: '2024-03-14 14:05:33',
    module: 'product',
    filename: '新产品导入.xlsx',
    upload_by: 'purchase',
    total_records: 45,
    success_records: 40,
    failed_records: 5,
    file_size: 1024 * 62, // 62KB
    status: 'failed',
    error_message: '第3、7、12、18、22行SKU格式无效',
    processing_time: '1.8秒',
    ip_address: '192.168.1.130',
    file_path: '/uploads/new_products_20240314.xlsx',
    error_file_path: '/errors/product_errors_20240314140533.xlsx',
    remarks: '新产品导入失败'
  },
  {
    id: 5,
    upload_time: '2024-03-14 11:30:15',
    module: 'business_report',
    filename: '业务报告Q1.xlsx',
    upload_by: 'finance',
    total_records: 12,
    success_records: 12,
    failed_records: 0,
    file_size: 1024 * 210, // 210KB
    status: 'success',
    error_message: '',
    processing_time: '4.3秒',
    ip_address: '192.168.1.140',
    file_path: '/uploads/business_report_q1.xlsx',
    error_file_path: null,
    remarks: '第一季度业务报告'
  }
])

// 计算过滤后的日志
const filteredLogs = computed(() => {
  let filtered = uploadLogs.value
  
  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(
      item => 
        item.filename?.toLowerCase().includes(keyword) ||
        item.upload_by?.toLowerCase().includes(keyword) ||
        item.module?.includes(keyword)
    )
  }
  
  // 模块筛选
  if (filterModule.value) {
    filtered = filtered.filter(item => item.module === filterModule.value)
  }
  
  // 状态筛选
  if (filterStatus.value) {
    filtered = filtered.filter(item => item.status === filterStatus.value)
  }
  
  // 日期筛选
  if (dateRange.value && dateRange.value.length === 2) {
    const [start, end] = dateRange.value
    filtered = filtered.filter(item => {
      const date = item.upload_time.split(' ')[0] // 提取日期部分
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

const formatDateTime = (datetimeStr) => {
  if (!datetimeStr) return '-'
  const date = new Date(datetimeStr.replace(' ', 'T'))
  return date.toLocaleString('zh-CN')
}

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`
}

const getModuleTag = (module) => {
  const map = {
    'product': 'primary',
    'order': 'success',
    'fba_inventory': 'warning',
    'fba_reserved': 'info',
    'business_report': 'danger'
  }
  return map[module] || ''
}

const getModuleText = (module) => {
  const map = {
    'product': '商品库存',
    'order': '订单数据',
    'fba_inventory': 'FBA库存',
    'fba_reserved': 'FBA预留库存',
    'business_report': '业务报告'
  }
  return map[module] || module
}

const getStatusTag = (status) => {
  const map = {
    'success': 'success',
    'failed': 'danger',
    'processing': 'warning'
  }
  return map[status] || ''
}

const getStatusText = (status) => {
  const map = {
    'success': '成功',
    'failed': '失败',
    'processing': '处理中'
  }
  return map[status] || status
}

// 搜索和筛选处理
const handleSearch = () => {
  currentPage.value = 1
  refreshData()
}

const resetFilters = () => {
  searchKeyword.value = ''
  filterModule.value = ''
  filterStatus.value = ''
  dateRange.value = []
  currentPage.value = 1
  refreshData()
}

// 查看日志详情
const viewLogDetails = (log) => {
  currentLog.value = log
  detailDialogVisible.value = true
}

// 删除日志
const deleteLog = async (logId) => {
  try {
    loading.value = true
    // TODO: 调用API删除日志
    await new Promise(resolve => setTimeout(resolve, 300))
    
    uploadLogs.value = uploadLogs.value.filter(log => log.id !== logId)
    ElMessage.success('日志删除成功')
    refreshData()
  } catch (error) {
    console.error('删除日志失败:', error)
    ElMessage.error('删除日志失败')
  } finally {
    loading.value = false
  }
}

// 清理旧日志
const clearOldLogs = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清理30天前的旧日志吗？此操作不可恢复。',
      '清理旧日志',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    loading.value = true
    // TODO: 调用API清理旧日志
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]
    
    const keepLogs = uploadLogs.value.filter(log => {
      const logDate = log.upload_time.split(' ')[0]
      return logDate >= thirtyDaysAgoStr
    })
    
    const deletedCount = uploadLogs.value.length - keepLogs.length
    uploadLogs.value = keepLogs
    
    ElMessage.success(`清理完成，删除了 ${deletedCount} 条旧日志`)
    refreshData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清理旧日志失败:', error)
      ElMessage.error('清理旧日志失败')
    }
  } finally {
    loading.value = false
  }
}

// 导出数据
const exportData = () => {
  ElMessage.info('导出日志数据功能开发中...')
}

// 刷新数据
const refreshData = async () => {
  loading.value = true
  try {
    // TODO: 调用API获取日志数据和统计信息
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // 更新统计数据
    const totalUploads = uploadLogs.value.length
    const successUploads = uploadLogs.value.filter(log => log.status === 'success').length
    const failedUploads = totalUploads - successUploads
    const totalData = uploadLogs.value.reduce((sum, log) => sum + (log.total_records || 0), 0)
    
    stats.value = {
      totalUploads,
      successUploads,
      failedUploads,
      totalData
    }
    
    totalCount.value = uploadLogs.value.length
  } catch (error) {
    console.error('获取日志数据失败:', error)
    ElMessage.error('获取日志数据失败')
  } finally {
    loading.value = false
  }
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

// 组件初始化
onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.upload-logs-container {
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

.stats-cards {
  margin-bottom: 20px;
}

.stats-card {
  height: 120px;
  border-radius: 8px;
}

.stats-item {
  display: flex;
  align-items: center;
  height: 100%;
}

.stats-icon {
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

.total-uploads .stats-icon {
  background-color: #409EFF;
}

.success-uploads .stats-icon {
  background-color: #67C23A;
}

.failed-uploads .stats-icon {
  background-color: #F56C6C;
}

.total-data .stats-icon {
  background-color: #E6A23C;
}

.stats-info {
  flex: 1;
}

.stats-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stats-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.stats-unit {
  font-size: 12px;
  color: #909399;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-content {
  display: flex;
  gap: 15px;
  align-items: center;
}

.search-input {
  width: 250px;
}

.module-select, .status-select {
  width: 150px;
}

.logs-table-card {
  margin-top: 20px;
}

.filename-cell {
  word-break: break-all;
}

.success-count {
  color: #67C23A;
  font-weight: bold;
}

.failed-count {
  color: #F56C6C;
  font-weight: bold;
}

.error-message {
  color: #F56C6C;
  font-size: 12px;
  word-break: break-all;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.log-detail-container {
  line-height: 1.6;
}

.error-detail {
  background-color: #fef0f0;
  padding: 10px;
  border-radius: 4px;
  margin-top: 5px;
  max-height: 200px;
  overflow-y: auto;
}

.error-detail pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: #F56C6C;
  font-size: 12px;
  font-family: 'Courier New', Courier, monospace;
}

.el-button {
  margin-right: 10px;
}

.el-button:last-child {
  margin-right: 0;
}

.el-descriptions {
  margin-bottom: 20px;
}

:deep(.el-link) {
  font-size: 14px;
}

:deep(.el-tag) {
  margin-right: 5px;
}
</style>