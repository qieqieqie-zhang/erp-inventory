<template>
  <div class="business-report-container">
    <!-- 页面标题和操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">业务报告</h1>
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>数据分析</el-breadcrumb-item>
          <el-breadcrumb-item>业务报告</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
      
      <div class="header-right">
        <el-button 
          type="primary" 
          :icon="Upload" 
          @click="showUploadDialog = true"
        >
          上传报告
        </el-button>
        <el-button 
          :icon="Download" 
          @click="handleExport"
          :loading="exportLoading"
        >
          导出数据
        </el-button>
        <el-button 
          :icon="Refresh" 
          @click="refreshData"
          :loading="loading"
        >
          刷新
        </el-button>
      </div>
    </div>

    <!-- 日期范围选择 -->
    <div class="filter-section">
      <div class="filter-row">
        <div class="filter-item">
          <span class="filter-label">日期范围：</span>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            @change="handleDateChange"
          />
        </div>
        
        <div class="filter-item">
          <span class="filter-label">快速选择：</span>
          <el-radio-group v-model="quickRange" @change="handleQuickRangeChange">
            <el-radio-button label="7">最近7天</el-radio-button>
            <el-radio-button label="30">最近30天</el-radio-button>
            <el-radio-button label="90">最近90天</el-radio-button>
          </el-radio-group>
        </div>
      </div>
    </div>

    <!-- 数据摘要卡片 -->
    <div class="summary-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="hover" class="summary-card">
            <div class="card-content">
              <div class="card-icon" style="background: #409eff20;">
                <el-icon color="#409eff"><Money /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-title">总销售额</div>
                <div class="card-value">¥ {{ formatCurrency(summary.total_sales || 0) }}</div>
                <div class="card-trend">
                  <el-icon v-if="salesTrend > 0" color="#f56c6c"><Top /></el-icon>
                  <el-icon v-else color="#67c23a"><Bottom /></el-icon>
                  <span :class="salesTrend > 0 ? 'trend-up' : 'trend-down'">
                    {{ Math.abs(salesTrend) }}%
                  </span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card shadow="hover" class="summary-card">
            <div class="card-content">
              <div class="card-icon" style="background: #67c23a20;">
                <el-icon color="#67c23a"><Document /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-title">总订单数</div>
                <div class="card-value">{{ formatNumber(summary.total_orders || 0) }}</div>
                <div class="card-subtitle">平均订单价值: ¥ {{ formatCurrency(summary.avg_sales_per_order || 0) }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card shadow="hover" class="summary-card">
            <div class="card-content">
              <div class="card-icon" style="background: #e6a23c20;">
                <el-icon color="#e6a23c"><Box /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-title">总销售数量</div>
                <div class="card-value">{{ formatNumber(summary.total_units || 0) }}</div>
                <div class="card-subtitle">转化率: {{ formatNumber((summary.avg_conversion_rate || 0), 2) }}%</div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card shadow="hover" class="summary-card">
            <div class="card-content">
              <div class="card-icon" style="background: #f56c6c20;">
                <el-icon color="#f56c6c"><Flag /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-title">报告总数</div>
                <div class="card-value">{{ formatNumber(summary.total_reports || 0) }}</div>
                <div class="card-subtitle">
                  {{ formatDate(summary.first_report_date) }} 至 {{ formatDate(summary.last_report_date) }}
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 图表区域 -->
    <div class="chart-section">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card shadow="never" class="chart-card">
            <template #header>
              <div class="chart-header">
                <span class="chart-title">销售额趋势</span>
                <div class="chart-actions">
                  <el-button-group>
                    <el-button size="small" :type="salesChartType === 'line' ? 'primary' : ''" @click="salesChartType = 'line'">折线图</el-button>
                    <el-button size="small" :type="salesChartType === 'bar' ? 'primary' : ''" @click="salesChartType = 'bar'">柱状图</el-button>
                  </el-button-group>
                </div>
              </div>
            </template>
            <div ref="salesChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
        
        <el-col :span="12">
          <el-card shadow="never" class="chart-card">
            <template #header>
              <div class="chart-header">
                <span class="chart-title">站点销售额分布</span>
              </div>
            </template>
            <div ref="siteChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 报告数据表格 -->
    <div class="table-section">
      <el-card shadow="never">
        <template #header>
          <div class="table-header">
            <span class="table-title">业务报告列表</span>
            <div class="table-actions">
              <el-input
                v-model="searchKeyword"
                placeholder="搜索报告ID或站点"
                :prefix-icon="Search"
                style="width: 200px; margin-right: 10px;"
                @input="handleSearch"
              />
              <el-button :icon="Refresh" @click="refreshTable">刷新</el-button>
              <el-button type="danger" :disabled="selectedReports.length === 0" @click="handleBatchDelete">批量删除{{ selectedReports.length > 0 ? `(${selectedReports.length})` : '' }}</el-button>
            </div>
          </div>
        </template>
        
        <el-table
          ref="reportTableRef"
          v-loading="tableLoading"
          :data="reportList"
          @selection-change="handleSelectionChange"
          style="width: 100%"
          :default-sort="{ prop: 'report_date', order: 'descending' }"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column prop="report_id" label="报告ID" width="180" />
          <el-table-column prop="site" label="站点" width="120">
            <template #default="{ row }">
              <el-tag size="small">{{ row.site }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="report_date" label="报告日期" width="120" sortable>
            <template #default="{ row }">
              {{ formatDate(row.report_date) }}
            </template>
          </el-table-column>
          <el-table-column prop="total_sales" label="销售额" width="120" sortable>
            <template #default="{ row }">
              <span class="currency-value">¥ {{ formatCurrency(row.total_sales) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="total_orders" label="订单数" width="100" sortable />
          <el-table-column prop="total_units" label="销售数量" width="100" sortable />
          <el-table-column prop="average_sales_per_order" label="平均订单价值" width="130" sortable>
            <template #default="{ row }">
              ¥ {{ formatCurrency(row.average_sales_per_order) }}
            </template>
          </el-table-column>
          <el-table-column prop="conversion_rate" label="转化率" width="100" sortable>
            <template #default="{ row }">
              {{ formatNumber(row.conversion_rate, 2) }}%
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="上传时间" width="160" sortable>
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button size="small" :icon="View" @click="handleViewDetail(row)">详情</el-button>
              <el-button size="small" :icon="Delete" type="danger" @click="handleDelete(row)" plain>删除</el-button>
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
    </div>

    <!-- 上传对话框 -->
    <UploadDialog
      v-model="showUploadDialog"
      title="上传业务报告"
      accept=".csv,.xlsx,.xls,.txt"
      :show-shop-select="true"
      :upload-fn="apiService.business.upload"
      upload-tip="支持 CSV、Excel、TXT 格式"
      @success="loadBusinessData"
    />

    <!-- 详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      :title="`业务报告详情 - ${selectedReport?.report_id || ''}`"
      width="800px"
    >
      <div v-if="selectedReport" class="detail-dialog-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="报告ID">{{ selectedReport.report_id }}</el-descriptions-item>
          <el-descriptions-item label="站点">{{ selectedReport.site }}</el-descriptions-item>
          <el-descriptions-item label="报告日期">{{ formatDate(selectedReport.report_date) }}</el-descriptions-item>
          <el-descriptions-item label="销售额">¥ {{ formatCurrency(selectedReport.total_sales) }}</el-descriptions-item>
          <el-descriptions-item label="订单数">{{ selectedReport.total_orders }}</el-descriptions-item>
          <el-descriptions-item label="销售数量">{{ selectedReport.total_units }}</el-descriptions-item>
          <el-descriptions-item label="平均订单价值">¥ {{ formatCurrency(selectedReport.average_sales_per_order) }}</el-descriptions-item>
          <el-descriptions-item label="转化率">{{ formatNumber(selectedReport.conversion_rate, 2) }}%</el-descriptions-item>
          <el-descriptions-item label="页面浏览量">{{ selectedReport.page_views }}</el-descriptions-item>
          <el-descriptions-item label="访客数">{{ selectedReport.visitors }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(selectedReport.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDateTime(selectedReport.updated_at) }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="detail-actions">
          <el-button @click="showDetailDialog = false">关闭</el-button>
          <el-button type="primary" @click="handleExportSingle(selectedReport)">导出此报告</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import { 
  Upload, Download, Refresh, Search, View, Delete,
  Money, Document, Box, Flag, Top, Bottom, Loading
} from '@element-plus/icons-vue'
import { apiService } from '@/utils/api.js'
import UploadDialog from '@/components/UploadDialog.vue'

// 数据状态
const loading = ref(false)
const tableLoading = ref(false)
const exportLoading = ref(false)
const uploadLoading = ref(false)

// 筛选状态
const dateRange = ref([])
const quickRange = ref('30')
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const totalCount = ref(0)

// 对话框状态
const showUploadDialog = ref(false)

const showDetailDialog = ref(false)
const selectedReport = ref(null)

// 数据
const summary = ref({})
const salesBySite = ref([])
const salesTrendData = ref([])
const reportList = ref([])
const salesChartType = ref('line')
const selectedReports = ref([])
const reportTableRef = ref(null)

// 图表引用
const salesChartRef = ref(null)
const siteChartRef = ref(null)
let salesChart = null
let siteChart = null

// 初始化日期范围
const initDateRange = () => {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)
  
  dateRange.value = [
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  ]
}

// 格式化函数
const formatCurrency = (value) => {
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const formatNumber = (value, decimals = 0) => {
  const num = Number(value);
  if (isNaN(num)) return decimals > 0 ? '0.'.padEnd(decimals + 2, '0') : '0';
  
  if (decimals > 0) {
    return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  return num.toLocaleString('zh-CN');
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return '-'
  return new Date(dateTimeStr).toLocaleString('zh-CN')
}

// 计算销售趋势（示例）
const salesTrend = computed(() => {
  // 这里可以计算实际趋势，暂时返回固定值
  return 12.5
})

// 加载数据
const loadBusinessData = async () => {
  loading.value = true
  try {
    const [summaryRes, reportsRes] = await Promise.all([
      apiService.business.getSummary({
        startDate: dateRange.value[0],
        endDate: dateRange.value[1]
      }),
      apiService.business.getReports({
        startDate: dateRange.value[0],
        endDate: dateRange.value[1],
        page: currentPage.value,
        pageSize: pageSize.value
      })
    ])
    
    summary.value = summaryRes.summary || {}
    salesBySite.value = summaryRes.salesBySite || []
    salesTrendData.value = summaryRes.salesTrend || []
    reportList.value = reportsRes.reports || []
    totalCount.value = reportsRes.pagination?.total || 0
    
    // 渲染图表
    nextTick(() => {
      renderSalesChart()
      renderSiteChart()
    })
  } catch (error) {
    console.error('加载业务报告数据失败:', error)
    ElMessage.error('加载数据失败: ' + (error.message || '未知错误'))
  } finally {
    loading.value = false
    tableLoading.value = false
  }
}

// 渲染销售额趋势图表
const renderSalesChart = () => {
  if (!salesChartRef.value) return
  
  if (salesChart) {
    salesChart.dispose()
  }
  
  salesChart = echarts.init(salesChartRef.value)
  
  const dates = salesTrendData.value.map(item => item.date)
  const salesData = salesTrendData.value.map(item => item.daily_sales)
  const ordersData = salesTrendData.value.map(item => item.daily_orders)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['销售额', '订单数']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        formatter: (value) => {
          return value.split('-').slice(1).join('-') // 显示月-日
        }
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '销售额(¥)',
        position: 'left'
      },
      {
        type: 'value',
        name: '订单数',
        position: 'right'
      }
    ],
    series: [
      {
        name: '销售额',
        type: salesChartType.value,
        data: salesData,
        yAxisIndex: 0,
        itemStyle: {
          color: '#409eff'
        },
        smooth: true
      },
      {
        name: '订单数',
        type: salesChartType.value === 'line' ? 'line' : 'bar',
        data: ordersData,
        yAxisIndex: 1,
        itemStyle: {
          color: '#67c23a'
        },
        smooth: true
      }
    ]
  }
  
  salesChart.setOption(option)
}

// 渲染站点分布图表
const renderSiteChart = () => {
  if (!siteChartRef.value) return
  
  if (siteChart) {
    siteChart.dispose()
  }
  
  siteChart = echarts.init(siteChartRef.value)
  
  const siteData = salesBySite.value
    .map(item => ({
      name: item.site,
      value: item.total_sales
    }))
    .sort((a, b) => b.value - a.value)
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: ¥{c} ({d}%)'
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 10,
      top: 20,
      bottom: 20,
      data: siteData.map(item => item.name)
    },
    series: [
      {
        name: '站点销售额',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '16',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: siteData
      }
    ]
  }
  
  siteChart.setOption(option)
}

// 事件处理函数
const handleDateChange = () => {
  currentPage.value = 1
  loadBusinessData()
}

const handleQuickRangeChange = (days) => {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - parseInt(days))
  
  dateRange.value = [
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  ]
  
  currentPage.value = 1
  loadBusinessData()
}

const handleSearch = () => {
  currentPage.value = 1
  loadBusinessData()
}

const handleSizeChange = (newSize) => {
  pageSize.value = newSize
  currentPage.value = 1
  loadBusinessData()
}

const handleCurrentChange = (newPage) => {
  currentPage.value = newPage
  loadBusinessData()
}

// 表格行样式函数
const tableRowClassName = ({ rowIndex }) => {
  return rowIndex % 2 === 0 ? 'even-row' : 'odd-row'
}



// 解析CSV单行（简单实现，支持去除引号）
const parseCSVLine = (line) => {
  // 简单逗号分割，去除首尾空格和引号
  return line.split(',').map(cell => {
    let trimmed = cell.trim()
    // 定义引号字符集合（包括英文和中文引号）
    const quoteChars = ['"', "'", '“', '”', '‘', '’']
    // 循环去除开头和结尾的引号（可能有多层）
    let changed
    do {
      changed = false
      if (trimmed.length === 0) break
      const firstChar = trimmed[0]
      const lastChar = trimmed[trimmed.length - 1]
      if (quoteChars.includes(firstChar) && quoteChars.includes(lastChar)) {
        trimmed = trimmed.substring(1, trimmed.length - 1)
        changed = true
      }
    } while (changed)
    return trimmed
  })
}


const handleExport = async () => {
  exportLoading.value = true
  try {
    const params = {
      startDate: dateRange.value[0],
      endDate: dateRange.value[1],
      format: 'csv'
    }
    
    const blob = await apiService.business.exportReports(params)
    
    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `business_reports_${dateRange.value[0]}_${dateRange.value[1]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败: ' + error.message)
  } finally {
    exportLoading.value = false
  }
}

const handleExportSingle = (report) => {
  ElMessage.info('单报告导出功能开发中')
}

const handleViewDetail = (report) => {
  selectedReport.value = report
  showDetailDialog.value = true
}

const handleSelectionChange = (selection) => {
  selectedReports.value = selection
}

const handleBatchDelete = () => {
  if (selectedReports.value.length === 0) return
  ElMessageBox.confirm(
    `确定要删除选中的 ${selectedReports.value.length} 份报告吗？此操作不可恢复。`,
    '批量删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      for (const report of selectedReports.value) {
        await apiService.business.deleteReport(report.id)
      }
      ElMessage.success('批量删除成功')
      selectedReports.value = []
      reportTableRef.value?.clearSelection()
      loadBusinessData()
    } catch (error) {
      ElMessage.error('批量删除失败: ' + error.message)
    }
  }).catch(() => {})
}

const handleDelete = (report) => {
  ElMessageBox.confirm(
    `确定要删除报告 "${report.report_id}" 吗？此操作不可恢复。`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await apiService.business.deleteReport(report.id)
      ElMessage.success('删除成功')
      loadBusinessData()
    } catch (error) {
      ElMessage.error('删除失败: ' + error.message)
    }
  }).catch(() => {})
}

const refreshData = () => {
  loadBusinessData()
}

const refreshTable = () => {
  currentPage.value = 1
  loadBusinessData()
}

// 生命周期钩子
onMounted(() => {
  initDateRange()
  loadBusinessData()
  window.addEventListener('resize', () => {
    if (salesChart) salesChart.resize()
    if (siteChart) siteChart.resize()
  })
})

onBeforeUnmount(() => {
  if (salesChart) salesChart.dispose()
  if (siteChart) siteChart.dispose()
  window.removeEventListener('resize', () => {})
})
</script>

<style scoped>
.business-report-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 120px);
}

/* 页面标题 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left .page-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.header-right {
  display: flex;
  gap: 12px;
}

/* 筛选区域 */
.filter-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 40px;
}

.filter-item {
  display: flex;
  align-items: center;
}

.filter-label {
  font-size: 14px;
  color: #606266;
  margin-right: 12px;
  white-space: nowrap;
}

/* 摘要卡片 */
.summary-cards {
  margin-bottom: 20px;
}

.summary-card {
  border: none;
  border-radius: 8px;
}

.summary-card .el-card__body {
  padding: 24px;
}

.card-content {
  display: flex;
  align-items: center;
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.card-icon .el-icon {
  font-size: 24px;
}

.card-info {
  flex: 1;
}

.card-title {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.card-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.card-subtitle {
  font-size: 12px;
  color: #909399;
}

.card-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.trend-up {
  color: #f56c6c;
}

.trend-down {
  color: #67c23a;
}

/* 图表区域 */
.chart-section {
  margin-bottom: 20px;
}

.chart-card {
  border-radius: 8px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.chart-container {
  height: 300px;
  width: 100%;
}

/* 表格区域 */
.table-section {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding: 20px 0;
}

/* 货币值 */
.currency-value {
  font-weight: bold;
  color: #409eff;
}

/* 上传对话框 */
.upload-dialog-content {
  padding: 10px 0;
  max-height: 70vh;
  overflow-y: auto;
}

/* 上传区域样式增强 */
.upload-demo {
  border: 2px dashed #409eff !important;
  border-radius: 8px !important;
  background-color: #f8fbff !important;
  transition: all 0.3s ease;
}

.upload-demo:hover {
  border-color: #67c23a !important;
  background-color: #f0f9ff !important;
}

.el-upload__text {
  font-size: 14px !important;
  color: #606266 !important;
}

.el-upload__text em {
  color: #409eff !important;
  font-weight: 600;
}

.upload-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

/* 详情对话框 */
.detail-dialog-content {
  padding: 10px 0;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .chart-section .el-col {
    width: 100%;
    margin-bottom: 20px;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .filter-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .table-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .summary-cards .el-col {
    width: 100%;
    margin-bottom: 16px;
  }
}

/* 上传预览表格增强样式 */
.even-row {
  background-color: #fafafa !important;
}

.odd-row {
  background-color: #ffffff !important;
}

.cell-content {
  padding: 6px 10px;
  font-size: 13px;
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
  line-height: 1.5;
}

/* 表格表头增强 */
.preview-card .el-table th {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: #ffffff !important;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  border: none !important;
  text-align: center;
  height: 48px;
  padding: 10px 0;
}

/* 表格边框增强 */
.preview-card .el-table {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

/* 表格单元格悬停效果 */
.preview-card .el-table--enable-row-hover .el-table__body tr:hover>td {
  background-color: #f0f7ff !important;
}

/* 文件信息卡片样式增强 */
.file-info {
  background: linear-gradient(135deg, #f6f9ff 0%, #f0f5ff 100%);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px !important;
  border: 1px solid #ebeef5;
}

.file-info div {
  padding: 4px 0;
  font-size: 13px;
  color: #606266;
}

.file-info strong {
  color: #303133;
  font-weight: 600;
}

/* 单元格类型样式 */
.empty-cell {
  color: #c0c4cc;
  font-style: italic;
}

.positive-amount {
  color: #67c23a;
  font-weight: 600;
}

.negative-amount {
  color: #f56c6c;
  font-weight: 600;
}

.numeric-cell {
  color: #409eff;
  font-weight: 500;
}

.percentage-cell {
  color: #e6a23c;
  font-weight: 500;
}

.date-cell {
  color: #909399;
  font-weight: 500;
}

.text-cell {
  color: #606266;
}

/* 增强表格视觉效果 */
.preview-card .el-table td {
  border-right: 1px solid #ebeef5 !important;
  border-bottom: 1px solid #ebeef5 !important;
}

.preview-card .el-table th.is-leaf {
  border-bottom: 2px solid #409eff !important;
}

/* 列宽自适应 */
.preview-card .el-table .el-table__body-wrapper {
  overflow-x: auto;
}

/* 滚动条美化 */
.preview-card .el-scrollbar__bar.is-vertical {
  width: 6px;
}

.preview-card .el-scrollbar__thumb {
  background-color: rgba(144, 147, 153, 0.3);
  border-radius: 3px;
}

.preview-card .el-scrollbar__thumb:hover {
  background-color: rgba(144, 147, 153, 0.5);
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