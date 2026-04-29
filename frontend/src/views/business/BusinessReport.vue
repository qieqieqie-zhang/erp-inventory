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
                <el-icon color="#409eff"><User /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-title">总会话数</div>
                <div class="card-value">{{ formatNumber(summary.total_sessions || 0) }}</div>
                <div class="card-subtitle">页面浏览量: {{ formatNumber(summary.total_page_views || 0) }}</div>
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
                <div class="card-title">总销售数量</div>
                <div class="card-value">{{ formatNumber(summary.total_units || 0) }}</div>
                <div class="card-subtitle">平均单件售价: ¥ {{ formatCurrency(summary.avg_unit_price || 0) }}</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card shadow="hover" class="summary-card">
            <div class="card-content">
              <div class="card-icon" style="background: #e6a23c20;">
                <el-icon color="#e6a23c"><Grid /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-title">订单商品数量转化率</div>
                <div class="card-value">{{ formatNumber((summary.avg_conversion_rate || 0), 2) }}%</div>
                <div class="card-subtitle">SKU数: {{ formatNumber(summary.total_skus || 0) }}</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card shadow="hover" class="summary-card">
            <div class="card-content">
              <div class="card-icon" style="background: #f56c6c20;">
                <el-icon color="#f56c6c"><Money /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-title">总销售额</div>
                <div class="card-value">¥ {{ formatCurrency(summary.total_sales || 0) }}</div>
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
                <span class="chart-title">会话数趋势</span>
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
                <span class="chart-title">SKU销售分布</span>
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
                placeholder="搜索SKU、ASIN或标题"
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

          <!-- 核心运营字段 -->
          <el-table-column prop="parent_asin" label="父ASIN" width="130" show-overflow-tooltip />
          <el-table-column prop="child_asin" label="子ASIN" width="130" show-overflow-tooltip />
          <el-table-column prop="sku" label="SKU" width="120" show-overflow-tooltip />
          <el-table-column prop="title" label="标题" width="180" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="title-cell" :title="row.title">{{ row.title || '-' }}</span>
            </template>
          </el-table-column>

          <!-- 核心指标 - 运营必看 -->
          <el-table-column prop="sessions" label="会话数" width="110" sortable align="right">
            <template #default="{ row }">
              <span class="numeric-cell">{{ formatNumber(row.sessions) }}</span>
            </template>
            <template #header>
              <span class="column-header-with-help">
                会话数
                <el-popover
                  placement="top"
                  :width="300"
                  trigger="hover"
                  :content="getFieldHelpContent('sessions')"
                  raw-content
                >
                  <template #reference>
                    <el-icon class="field-help-icon" color="#909399"><QuestionFilled /></el-icon>
                  </template>
                </el-popover>
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="page_views" label="页面浏览量" width="120" sortable align="right">
            <template #default="{ row }">
              <span class="numeric-cell">{{ formatNumber(row.page_views) }}</span>
            </template>
            <template #header>
              <span class="column-header-with-help">
                页面浏览量
                <el-popover
                  placement="top"
                  :width="300"
                  trigger="hover"
                  :content="getFieldHelpContent('page_views')"
                  raw-content
                >
                  <template #reference>
                    <el-icon class="field-help-icon" color="#909399"><QuestionFilled /></el-icon>
                  </template>
                </el-popover>
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="page_views_percentage" label="页面浏览量占比" width="130" sortable align="right">
            <template #default="{ row }">
              <span class="percentage-cell">{{ formatNumber(row.page_views_percentage, 2) }}%</span>
            </template>
            <template #header>
              <span class="column-header-with-help">
                页面浏览量占比
                <el-popover
                  placement="top"
                  :width="300"
                  trigger="hover"
                  :content="getFieldHelpContent('page_views_percentage')"
                  raw-content
                >
                  <template #reference>
                    <el-icon class="field-help-icon" color="#909399"><QuestionFilled /></el-icon>
                  </template>
                </el-popover>
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="product_session_percentage" label="订单商品数量转化率" width="150" sortable align="right">
            <template #default="{ row }">
              <span class="highlight-cell">{{ formatNumber(row.product_session_percentage, 2) }}%</span>
            </template>
            <template #header>
              <span class="column-header-with-help">
                订单商品数量转化率
                <el-popover
                  placement="top"
                  :width="300"
                  trigger="hover"
                  :content="getFieldHelpContent('product_session_percentage')"
                  raw-content
                >
                  <template #reference>
                    <el-icon class="field-help-icon" color="#909399"><QuestionFilled /></el-icon>
                  </template>
                </el-popover>
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="avg_unit_price" label="平均单件售价" width="130" sortable align="right">
            <template #default="{ row }">
              <span class="currency-value">¥ {{ formatCurrency(row.avg_unit_price || 0) }}</span>
            </template>
            <template #header>
              <span class="column-header-with-help">
                平均单件售价
                <el-popover
                  placement="top"
                  :width="300"
                  trigger="hover"
                  :content="getFieldHelpContent('avg_unit_price')"
                  raw-content
                >
                  <template #reference>
                    <el-icon class="field-help-icon" color="#909399"><QuestionFilled /></el-icon>
                  </template>
                </el-popover>
              </span>
            </template>
          </el-table-column>

          <!-- 次要指标 - 销售相关 -->
          <el-table-column prop="ordered_quantity" label="已订购商品数量" width="130" sortable align="right">
            <template #default="{ row }">
              <span class="numeric-cell">{{ formatNumber(row.ordered_quantity) }}</span>
            </template>
            <template #header>
              <span class="column-header-with-help">
                已订购商品数量
                <el-popover
                  placement="top"
                  :width="300"
                  trigger="hover"
                  :content="getFieldHelpContent('ordered_quantity')"
                  raw-content
                >
                  <template #reference>
                    <el-icon class="field-help-icon" color="#909399"><QuestionFilled /></el-icon>
                  </template>
                </el-popover>
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="sales_amount" label="已订购商品销售额" width="140" sortable align="right">
            <template #default="{ row }">
              <span class="currency-value">¥ {{ formatCurrency(row.sales_amount || 0) }}</span>
            </template>
            <template #header>
              <span class="column-header-with-help">
                已订购商品销售额
                <el-popover
                  placement="top"
                  :width="300"
                  trigger="hover"
                  :content="getFieldHelpContent('sales_amount')"
                  raw-content
                >
                  <template #reference>
                    <el-icon class="field-help-icon" color="#909399"><QuestionFilled /></el-icon>
                  </template>
                </el-popover>
              </span>
            </template>
          </el-table-column>

          <!-- 表现标签 -->
          <el-table-column label="表现标签" width="120" align="center">
            <template #default="{ row }">
              <el-tag
                :type="getPerformanceTagType(row.performance_tag)"
                size="small"
              >
                {{ row.performance_tag || '常规' }}
              </el-tag>
            </template>
          </el-table-column>

          <!-- 操作 -->
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
      :title="`业务报告详情 - ${selectedReport?.sku || ''}`"
      width="900px"
    >
      <div v-if="selectedReport" class="detail-dialog-content">
        <!-- 核心指标 -->
        <div class="detail-section">
          <h4 class="detail-section-title">核心指标</h4>
          <el-descriptions :column="3" border>
            <el-descriptions-item label="SKU">{{ selectedReport.sku }}</el-descriptions-item>
            <el-descriptions-item label="会话数">{{ formatNumber(selectedReport.sessions) }}</el-descriptions-item>
            <el-descriptions-item label="页面浏览量">{{ formatNumber(selectedReport.page_views) }}</el-descriptions-item>
            <el-descriptions-item label="页面浏览量占比">{{ formatNumber(selectedReport.page_views_percentage, 2) }}%</el-descriptions-item>
            <el-descriptions-item label="订单商品数量转化率">
              <span class="highlight-cell">{{ formatNumber(selectedReport.product_session_percentage, 2) }}%</span>
            </el-descriptions-item>
            <el-descriptions-item label="平均单件售价">¥ {{ formatCurrency(selectedReport.avg_unit_price || 0) }}</el-descriptions-item>
            <el-descriptions-item label="已订购商品数量">{{ formatNumber(selectedReport.ordered_quantity) }}</el-descriptions-item>
            <el-descriptions-item label="已订购商品销售额">¥ {{ formatCurrency(selectedReport.sales_amount || 0) }}</el-descriptions-item>
            <el-descriptions-item label="报告日期">{{ formatDate(selectedReport.report_date) }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- ASIN信息 -->
        <div class="detail-section">
          <h4 class="detail-section-title">ASIN 信息</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="父ASIN">{{ selectedReport.parent_asin || '-' }}</el-descriptions-item>
            <el-descriptions-item label="子ASIN">{{ selectedReport.child_asin || '-' }}</el-descriptions-item>
            <el-descriptions-item label="标题" :span="2">{{ selectedReport.title || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- B2B 指标 -->
        <div class="detail-section">
          <h4 class="detail-section-title">B2B 指标</h4>
          <el-descriptions :column="3" border>
            <el-descriptions-item label="B2B 会话数">{{ formatNumber(selectedReport.sessions_b2b || 0) }}</el-descriptions-item>
            <el-descriptions-item label="B2B 页面浏览量">{{ formatNumber(selectedReport.page_views_b2b || 0) }}</el-descriptions-item>
            <el-descriptions-item label="B2B 页面浏览量百分比">{{ formatNumber(selectedReport.page_views_percentage_b2b || 0, 2) }}%</el-descriptions-item>
            <el-descriptions-item label="推荐报价百分比">{{ formatNumber(selectedReport.recommended_offer_percentage || 0, 2) }}%</el-descriptions-item>
            <el-descriptions-item label="推荐报价百分比 - B2B">{{ formatNumber(selectedReport.recommended_offer_percentage_b2b || 0, 2) }}%</el-descriptions-item>
            <el-descriptions-item label="商品会话百分比 - B2B">{{ formatNumber(selectedReport.product_session_percentage_b2b || 0, 2) }}%</el-descriptions-item>
            <el-descriptions-item label="已订购商品数量 - B2B">{{ formatNumber(selectedReport.ordered_quantity_b2b || 0) }}</el-descriptions-item>
            <el-descriptions-item label="已订购商品销售额 - B2B">¥ {{ formatCurrency(selectedReport.sales_amount_b2b || 0) }}</el-descriptions-item>
            <el-descriptions-item label="订单商品总数 - B2B">{{ formatNumber(selectedReport.total_order_items_b2b || 0) }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 辅助信息 -->
        <div class="detail-section">
          <h4 class="detail-section-title">辅助信息</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="订单商品总数">{{ formatNumber(selectedReport.total_order_items || 0) }}</el-descriptions-item>
            <el-descriptions-item label="上传时间">{{ formatDateTime(selectedReport.created_at) }}</el-descriptions-item>
          </el-descriptions>
        </div>

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
  Money, Document, Grid, User, Flag, Loading, QuestionFilled
} from '@element-plus/icons-vue'
import { apiService } from '@/utils/api.js'
import UploadDialog from '@/components/UploadDialog.vue'
import { businessReportFieldHelp } from '@/config/businessReportFieldHelp.js'

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

// 用于计算表现标签的均值
const globalAvgSessions = ref(0)
const globalAvgConversion = ref(0)

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
  return Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const formatNumber = (value, decimals = 0) => {
  const num = Number(value || 0);
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

/**
 * 计算表现标签
 * @param {Object} row 数据行
 * @returns {string} 表现标签
 */
const calculatePerformanceTag = (row) => {
  const sessions = row.sessions || 0;
  const conversion = row.product_session_percentage || 0;
  const orderedQty = row.ordered_quantity || 0;

  // 高流量低转化：会话数高于整体均值 且 转化率低于整体均值
  if (sessions > globalAvgSessions.value && conversion < globalAvgConversion.value) {
    return '高流量低转化';
  }

  // 低流量高转化：会话数低于整体均值 且 转化率高于整体均值
  if (sessions < globalAvgSessions.value && conversion > globalAvgConversion.value) {
    return '低流量高转化';
  }

  // 高流量无订单：会话数较高 但 已订购商品数量 = 0
  if (sessions > globalAvgSessions.value && orderedQty === 0) {
    return '高流量无订单';
  }

  // 高转化高销量：转化率高 且 已订购商品数量高
  if (conversion > globalAvgConversion.value && orderedQty > (summary.value.total_units / Math.max(summary.value.total_skus, 1))) {
    return '高转化高销量';
  }

  return '常规';
}

/**
 * 获取表现标签的颜色类型
 */
const getPerformanceTagType = (tag) => {
  switch (tag) {
    case '高流量低转化': return 'warning';
    case '低流量高转化': return 'success';
    case '高流量无订单': return 'danger';
    case '高转化高销量': return 'primary';
    default: return 'info';
  }
}

/**
 * 获取字段说明的 Popover 显示内容
 */
const getFieldHelpContent = (fieldKey) => {
  const help = businessReportFieldHelp[fieldKey]
  if (!help) return ''
  return `<div class="field-help-content">
    <div class="field-help-item"><span class="field-help-label">原始字段：</span><span class="field-help-value">${help.originalField}</span></div>
    <div class="field-help-item"><span class="field-help-label">含义：</span><span class="field-help-value">${help.meaning}</span></div>
    <div class="field-help-item"><span class="field-help-label">运营用途：</span><span class="field-help-value">${help.usage}</span></div>
  </div>`
}

/**
 * 生成表头标签（文字 + 问号）
 */
const getColumnLabel = (text, fieldKey) => {
  return text
}

/**
 * 为每条记录计算表现标签
 */
const enrichReportListWithTags = (list) => {
  if (!list || list.length === 0) return list;

  // 计算全局均值
  const totalSessions = list.reduce((sum, item) => sum + (item.sessions || 0), 0);
  const totalConversion = list.reduce((sum, item) => sum + (item.product_session_percentage || 0), 0);
  globalAvgSessions.value = list.length > 0 ? totalSessions / list.length : 0;
  globalAvgConversion.value = list.length > 0 ? totalConversion / list.length : 0;

  // 为每条记录添加表现标签
  return list.map(item => ({
    ...item,
    performance_tag: calculatePerformanceTag(item)
  }));
}

// 加载数据
const loadBusinessData = async () => {
  loading.value = true
  tableLoading.value = true
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

    // 为报告列表添加表现标签
    reportList.value = enrichReportListWithTags(reportsRes.reports || [])
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

// 渲染会话数趋势图表
const renderSalesChart = () => {
  if (!salesChartRef.value) return

  if (salesChart) {
    salesChart.dispose()
  }

  salesChart = echarts.init(salesChartRef.value)

  const dates = salesTrendData.value.map(item => item.date)
  const sessionsData = salesTrendData.value.map(item => item.daily_sessions || item.daily_orders)
  const pageViewsData = salesTrendData.value.map(item => item.total_page_views)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['会话数', '页面浏览量']
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
          return value.split('-').slice(1).join('-')
        }
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '会话数',
        position: 'left'
      },
      {
        type: 'value',
        name: '页面浏览量',
        position: 'right'
      }
    ],
    series: [
      {
        name: '会话数',
        type: salesChartType.value,
        data: sessionsData,
        yAxisIndex: 0,
        itemStyle: {
          color: '#409eff'
        },
        smooth: true
      },
      {
        name: '页面浏览量',
        type: salesChartType.value === 'line' ? 'line' : 'bar',
        data: pageViewsData,
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

// 渲染SKU分布图表
const renderSiteChart = () => {
  if (!siteChartRef.value) return

  if (siteChart) {
    siteChart.dispose()
  }

  siteChart = echarts.init(siteChartRef.value)

  const siteData = salesBySite.value
    .map(item => ({
      name: item.site,
      value: item.total_sessions || item.total_page_views || 0
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
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
        name: 'SKU分布',
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

const handleExport = async () => {
  exportLoading.value = true
  try {
    const params = {
      startDate: dateRange.value[0],
      endDate: dateRange.value[1],
      format: 'csv'
    }

    const blob = await apiService.business.exportReports(params)

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
    `确定要删除报告 "${report.sku}" 吗？此操作不可恢复。`,
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

.currency-value {
  font-weight: bold;
  color: #409eff;
}

.numeric-cell {
  color: #303133;
  font-weight: 500;
}

.percentage-cell {
  color: #e6a23c;
  font-weight: 500;
}

.highlight-cell {
  color: #f56c6c;
  font-weight: bold;
}

.title-cell {
  display: inline-block;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section-title {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #409eff;
}

.detail-dialog-content {
  padding: 10px 0;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

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

/* 表头问号说明样式 */
.column-header-with-help {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: help;
}

.field-help-icon {
  cursor: help;
  font-size: 14px;
  transition: color 0.2s;
}

.field-help-icon:hover {
  color: #409eff !important;
}

/* 字段说明 Popover 内容样式 */
:deep(.field-help-content) {
  font-size: 12px;
  line-height: 1.6;
}

:deep(.field-help-item) {
  margin-bottom: 8px;
}

:deep(.field-help-item:last-child) {
  margin-bottom: 0;
}

:deep(.field-help-label) {
  font-weight: 600;
  color: #303133;
}

:deep(.field-help-value) {
  color: #606266;
}
</style>