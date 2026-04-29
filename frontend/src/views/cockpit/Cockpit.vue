<template>
  <div class="cockpit-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">经营驾驶舱</h1>
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>数据分析</el-breadcrumb-item>
          <el-breadcrumb-item>经营驾驶舱</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
      <div class="header-right">
        <el-button :icon="Refresh" @click="refreshAll" :loading="loading">刷新</el-button>
      </div>
    </div>

    <!-- 说明 -->
    <div class="page-note">
      本页为固定多时间窗口经营看板，列表同时展示近1天、近3天、近7天、近14天、近30天等销量节奏数据，用于快速判断销售变化、库存风险和补货优先级。
    </div>

    <!-- 顶部经营总览卡片 -->
    <div class="overview-cards">
      <el-row :gutter="20">
        <el-col :span="4">
          <el-card shadow="hover" class="overview-card sales-card">
            <div class="card-content">
              <div class="card-icon">
                <el-icon color="#409eff"><Money /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-label">近1天销量</div>
                <div class="card-value">{{ formatNumber(overviewData.units1d) }}</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="4">
          <el-card shadow="hover" class="overview-card">
            <div class="card-content">
              <div class="card-icon" style="background: #e6a23c20;">
                <el-icon color="#e6a23c"><Box /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-label">近3天销量</div>
                <div class="card-value">{{ formatNumber(overviewData.units3d) }}</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="4">
          <el-card shadow="hover" class="overview-card">
            <div class="card-content">
              <div class="card-icon" style="background: #67c23a20;">
                <el-icon color="#67c23a"><Document /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-label">近7天销量</div>
                <div class="card-value">{{ formatNumber(overviewData.units7d) }}</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="4">
          <el-card shadow="hover" class="overview-card danger-card">
            <div class="card-content">
              <div class="card-icon" style="background: #f56c6c20;">
                <el-icon color="#f56c6c"><WarningFilled /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-label">断货风险SKU数</div>
                <div class="card-value warning">{{ overviewData.stockOutRiskSkuCount }}</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="4">
          <el-card shadow="hover" class="overview-card warning-card">
            <div class="card-content">
              <div class="card-icon" style="background: #e6a23c20;">
                <el-icon color="#e6a23c"><Top /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-label">建议补货SKU数</div>
                <div class="card-value warning-text">{{ overviewData.replenishSuggestedSkuCount }}</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="4">
          <el-card shadow="hover" class="overview-card info-card">
            <div class="card-content">
              <div class="card-icon" style="background: #90939920;">
                <el-icon color="#909399"><Van /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-label">在途SKU数</div>
                <div class="card-value">{{ overviewData.inTransitSkuCount }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 经营核心总表 -->
    <div class="core-table-section">
      <el-card shadow="never">
        <template #header>
          <div class="table-header">
            <span class="table-title">经营核心总表</span>
            <div class="table-actions">
              <!-- 搜索 -->
              <el-input
                v-model="filters.search"
                placeholder="SKU/商品名称/ASIN"
                :prefix-icon="Search"
                style="width: 180px; margin-right: 10px;"
                clearable
                @input="handleFilterChange"
              />
              <!-- 补货建议过滤 -->
              <el-select
                v-model="filters.replenishment"
                placeholder="补货建议"
                style="width: 120px; margin-right: 10px;"
                clearable
                @change="handleFilterChange"
              >
                <el-option label="全部" value="all" />
                <el-option label="立即补货" value="立即补货" />
                <el-option label="观察在途" value="观察在途" />
                <el-option label="暂不补货" value="暂不补货" />
                <el-option label="控制补货" value="控制补货" />
              </el-select>
              <!-- 风险标签过滤 -->
              <el-select
                v-model="filters.riskTag"
                placeholder="风险标签"
                style="width: 120px; margin-right: 10px;"
                clearable
                @change="handleFilterChange"
              >
                <el-option label="全部" value="all" />
                <el-option label="高断货风险" value="高断货风险" />
                <el-option label="在途可缓解" value="在途可缓解" />
                <el-option label="库存健康" value="库存健康" />
                <el-option label="高流量低转化" value="高流量低转化" />
                <el-option label="过剩风险" value="过剩风险" />
              </el-select>
              <!-- 是否有在途 -->
              <el-select
                v-model="filters.hasInTransit"
                placeholder="在途"
                style="width: 100px; margin-right: 10px;"
                clearable
                @change="handleFilterChange"
              >
                <el-option label="全部" value="" />
                <el-option label="有在途" value="yes" />
                <el-option label="无在途" value="no" />
              </el-select>
              <!-- 一级分类过滤 -->
              <el-select
                v-model="filters.categoryId"
                placeholder="一级分类"
                style="width: 140px; margin-right: 10px;"
                clearable
                filterable
                @change="handleFilterChange"
              >
                <el-option
                  v-for="cat in categoryList"
                  :key="cat.id"
                  :label="cat.category_name"
                  :value="cat.id"
                />
              </el-select>
            </div>
          </div>
        </template>

        <el-table
          v-loading="tableLoading"
          :data="filteredCoreTable"
          style="width: 100%"
          :default-sort="{ prop: sortField, order: 'descending' }"
          border
        >
          <!-- 固定列 - SKU -->
          <el-table-column prop="sku" label="SKU" width="120" fixed="left" show-overflow-tooltip />
          <!-- 中文名称 -->
          <el-table-column prop="product_name_cn" label="中文名称" width="160" fixed="left" show-overflow-tooltip>
            <template #default="{ row }">
              <span>{{ row.product_name_cn || '-' }}</span>
            </template>
          </el-table-column>
          <!-- 固定列 - 商品名称 -->
          <el-table-column prop="product_name" label="商品名称" width="160" fixed="left" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="product-name-cell" :title="row.product_name">{{ row.product_name || '-' }}</span>
            </template>
          </el-table-column>

          <!-- 销量时间窗口字段 -->
          <el-table-column prop="sales_1day" width="90" sortable align="right">
            <template #header>
              <span class="column-header-with-help">
                <span>近1天</span>
                <FieldHelpPopover field-key="sales_1day" />
              </span>
            </template>
            <template #default="{ row }">
              <span class="numeric-cell">{{ row.sales_1day !== null ? formatNumber(row.sales_1day) : '-' }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="sales_3days" width="90" sortable align="right">
            <template #header>
              <span class="column-header-with-help">
                <span>近3天</span>
                <FieldHelpPopover field-key="sales_3days" />
              </span>
            </template>
            <template #default="{ row }">
              <span class="numeric-cell">{{ row.sales_3days !== null ? formatNumber(row.sales_3days) : '-' }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="avg_daily_sales_3d" width="100" sortable align="right">
            <template #header>
              <span class="column-header-with-help">
                <span>近3天日均单</span>
                <FieldHelpPopover field-key="avg_daily_sales_3d" />
              </span>
            </template>
            <template #default="{ row }">
              <span class="numeric-cell">{{ row.avg_daily_sales_3d !== null ? formatNumber(row.avg_daily_sales_3d, 1) : '-' }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="trend_3d_vs_7d" width="110" sortable align="right">
            <template #header>
              <span class="column-header-with-help">
                <span>3天内趋势</span>
                <FieldHelpPopover field-key="trend_3d_vs_7d" />
              </span>
            </template>
            <template #default="{ row }">
              <span :class="getTrendClass(row.trend_3d_vs_7d)">
                {{ formatTrend(row.trend_3d_vs_7d) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column prop="sales_7days" width="90" sortable align="right">
            <template #header>
              <span class="column-header-with-help">
                <span>近7天</span>
                <FieldHelpPopover field-key="sales_7days" />
              </span>
            </template>
            <template #default="{ row }">
              <span class="numeric-cell">{{ row.sales_7days !== null ? formatNumber(row.sales_7days) : '-' }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="avg_daily_sales_7d" width="100" sortable align="right">
            <template #header>
              <span class="column-header-with-help">
                <span>近7天日均单</span>
                <FieldHelpPopover field-key="avg_daily_sales_7d" />
              </span>
            </template>
            <template #default="{ row }">
              <span class="numeric-cell">{{ row.avg_daily_sales_7d !== null ? formatNumber(row.avg_daily_sales_7d, 1) : '-' }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="trend_7d_vs_30d" width="110" sortable align="right">
            <template #header>
              <span class="column-header-with-help">
                <span>7天内趋势</span>
                <FieldHelpPopover field-key="trend_7d_vs_30d" />
              </span>
            </template>
            <template #default="{ row }">
              <span :class="getTrendClass(row.trend_7d_vs_30d)">
                {{ formatTrend(row.trend_7d_vs_30d) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column prop="sales_14days" width="90" sortable align="right">
            <template #header>
              <span class="column-header-with-help">
                <span>近14天</span>
                <FieldHelpPopover field-key="sales_14days" />
              </span>
            </template>
            <template #default="{ row }">
              <span class="numeric-cell">{{ row.sales_14days !== null ? formatNumber(row.sales_14days) : '-' }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="sales_30days" width="90" sortable align="right">
            <template #header>
              <span class="column-header-with-help">
                <span>近30天</span>
                <FieldHelpPopover field-key="sales_30days" />
              </span>
            </template>
            <template #default="{ row }">
              <span class="numeric-cell">{{ row.sales_30days !== null ? formatNumber(row.sales_30days) : '-' }}</span>
            </template>
          </el-table-column>

          <!-- 流量与转化 -->
          <el-table-column prop="sessions" label="会话数" width="75" sortable align="right">
            <template #default="{ row }">
              <span class="numeric-cell">{{ row.sessions !== null ? formatNumber(row.sessions) : '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="page_views_percentage" label="页面浏览量占比" width="100" sortable align="right">
            <template #default="{ row }">
              <span class="percentage-cell">{{ row.page_views_percentage !== null ? formatNumber(row.page_views_percentage, 2) + '%' : '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="product_session_percentage" label="转化率" width="70" sortable align="right">
            <template #default="{ row }">
              <span class="highlight-cell">{{ row.product_session_percentage !== null ? formatNumber(row.product_session_percentage, 2) + '%' : '-' }}</span>
            </template>
          </el-table-column>

          <!-- 库存 -->
          <el-table-column prop="available_quantity" label="可售库存" width="85" sortable align="right">
            <template #default="{ row }">
              <span class="numeric-cell">{{ row.available_quantity !== null ? formatNumber(row.available_quantity) : '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="days_of_supply" label="可售天数" width="75" sortable align="right">
            <template #default="{ row }">
              <span :class="getDaysSupplyClass(row.days_of_supply)">
                {{ row.days_of_supply !== null ? row.days_of_supply : '-' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="in_transit_quantity" label="物流在途" width="85" sortable align="right">
            <template #default="{ row }">
              <span class="transit-cell">{{ formatNumber(row.in_transit_quantity) }}</span>
            </template>
          </el-table-column>

          <!-- 补货建议与风险 -->
          <el-table-column prop="replenishment_suggestion" label="补货建议" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getSuggestionTagType(row.replenishment_type)" size="small">
                {{ row.replenishment_suggestion }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="risk_tag" label="风险标签" width="140" align="center">
            <template #default="{ row }">
              <el-tag :type="getRiskTagType(row.risk_type)" size="small" style="margin-bottom: 2px;">
                {{ row.risk_tag }}
              </el-tag>
              <template v-if="row.extra_tags && row.extra_tags.length > 0">
                <el-tag
                  v-for="(tag, idx) in row.extra_tags"
                  :key="idx"
                  :type="getExtraTagType(tag.tagType)"
                  size="small"
                  style="margin-left: 2px;"
                >
                  {{ tag.tag }}
                </el-tag>
              </template>
            </template>
          </el-table-column>

          <!-- 操作 -->
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-dropdown trigger="click" @command="handleActionCommand(row, $event)">
                <el-button size="small" type="primary">
                  查看详情<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="business">查看业务报告</el-dropdown-item>
                    <el-dropdown-item command="orders">查看订单销量</el-dropdown-item>
                    <el-dropdown-item command="fba">查看FBA库存</el-dropdown-item>
                    <el-dropdown-item command="reserved">查看FBA预留</el-dropdown-item>
                    <el-dropdown-item command="logistics">查看物流在途</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="totalCount"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>

    <!-- 重点预警区 -->
    <div class="alerts-section">
      <el-row :gutter="20">
        <!-- 断货风险 Top 10 -->
        <el-col :span="8">
          <el-card shadow="never" class="alert-card">
            <template #header>
              <div class="alert-card-header danger">
                <el-icon><WarningFilled /></el-icon>
                <span>断货风险 Top 10</span>
              </div>
            </template>
            <div v-if="alertsData.stockOutRiskStatus === 'ok' && alertsData.stockOutRisk?.length > 0" class="alert-list">
              <div
                v-for="(item, index) in alertsData.stockOutRisk"
                :key="index"
                class="alert-item"
              >
                <div class="alert-item-left">
                  <span class="alert-rank">{{ index + 1 }}</span>
                  <div class="alert-info">
                    <div class="alert-sku">{{ item.sku }}</div>
                    <div class="alert-name">{{ item.product_name }}</div>
                  </div>
                </div>
                <div class="alert-item-right">
                  <div class="alert-metric">
                    <span class="metric-label">可售天数</span>
                    <span class="metric-value danger">{{ item.days_supply }}</span>
                  </div>
                  <el-button size="small" @click="jumpToFba(item.sku)">查看</el-button>
                </div>
              </div>
            </div>
            <div v-else-if="alertsData.stockOutRiskStatus === 'lack_inventory_data'" class="empty-alert">
              <div class="alert-status-message">缺少FBA库存数据</div>
              <div class="alert-status-tip">请先上传FBA库存报告</div>
            </div>
            <div v-else-if="alertsData.stockOutRiskStatus === 'no_data'" class="empty-alert">
              <div class="alert-status-message">当前无断货风险SKU</div>
              <div class="alert-status-tip">库存状况良好</div>
            </div>
            <div v-else class="empty-alert">暂无数据</div>
          </el-card>
        </el-col>

        <!-- 建议补货 Top 10 -->
        <el-col :span="8">
          <el-card shadow="never" class="alert-card">
            <template #header>
              <div class="alert-card-header warning">
                <el-icon><Top /></el-icon>
                <span>建议补货 Top 10</span>
              </div>
            </template>
            <div v-if="alertsData.replenishSuggestedStatus === 'ok' && alertsData.replenishSuggested?.length > 0" class="alert-list">
              <div
                v-for="(item, index) in alertsData.replenishSuggested"
                :key="index"
                class="alert-item"
              >
                <div class="alert-item-left">
                  <span class="alert-rank">{{ index + 1 }}</span>
                  <div class="alert-info">
                    <div class="alert-sku">{{ item.sku }}</div>
                    <div class="alert-name">{{ item.product_name }}</div>
                  </div>
                </div>
                <div class="alert-item-right">
                  <div class="alert-metric">
                    <span class="metric-label">可售天数</span>
                    <span class="metric-value warning">{{ item.days_supply }}</span>
                  </div>
                  <el-button size="small" @click="jumpToOrders(item.sku)">查看</el-button>
                </div>
              </div>
            </div>
            <div v-else-if="alertsData.replenishSuggestedStatus === 'lack_inventory_data'" class="empty-alert">
              <div class="alert-status-message">缺少FBA库存数据</div>
              <div class="alert-status-tip">请先上传FBA库存报告</div>
            </div>
            <div v-else-if="alertsData.replenishSuggestedStatus === 'no_data'" class="empty-alert">
              <div class="alert-status-message">当前无需补货SKU</div>
              <div class="alert-status-tip">库存充足</div>
            </div>
            <div v-else class="empty-alert">暂无数据</div>
          </el-card>
        </el-col>

        <!-- 高流量低转化 Top 10 -->
        <el-col :span="8">
          <el-card shadow="never" class="alert-card">
            <template #header>
              <div class="alert-card-header warning">
                <el-icon><TrendCharts /></el-icon>
                <span>高流量低转化 Top 10</span>
              </div>
            </template>
            <div v-if="alertsData.highTrafficLowConversionStatus === 'ok' && alertsData.highTrafficLowConversion?.length > 0" class="alert-list">
              <div
                v-for="(item, index) in alertsData.highTrafficLowConversion"
                :key="index"
                class="alert-item"
              >
                <div class="alert-item-left">
                  <span class="alert-rank">{{ index + 1 }}</span>
                  <div class="alert-info">
                    <div class="alert-sku">{{ item.sku }}</div>
                    <div class="alert-name">{{ item.product_name }}</div>
                  </div>
                </div>
                <div class="alert-item-right">
                  <div class="alert-metric">
                    <span class="metric-label">转化率</span>
                    <span class="metric-value">{{ formatNumber(item.conversion, 2) }}%</span>
                  </div>
                  <el-button size="small" @click="jumpToBusiness(item.sku)">查看</el-button>
                </div>
              </div>
            </div>
            <div v-else-if="alertsData.highTrafficLowConversionStatus === 'lack_business_data'" class="empty-alert">
              <div class="alert-status-message">缺少业务报告数据</div>
              <div class="alert-status-tip">请先上传业务报告</div>
            </div>
            <div v-else-if="alertsData.highTrafficLowConversionStatus === 'no_data'" class="empty-alert">
              <div class="alert-status-message">当前无高流量低转化商品</div>
              <div class="alert-status-tip">转化率表现正常</div>
            </div>
            <div v-else class="empty-alert">暂无数据</div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 趋势区 -->
    <div class="trend-section">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card shadow="never" class="chart-card">
            <template #header>
              <div class="chart-header">
                <span class="chart-title">近30天销量趋势</span>
              </div>
            </template>
            <div ref="salesTrendChartRef" class="chart-container"></div>
          </el-card>
        </el-col>

        <el-col :span="12">
          <el-card shadow="never" class="chart-card">
            <template #header>
              <div class="chart-header">
                <span class="chart-title">近30天销售额趋势</span>
              </div>
            </template>
            <div ref="amountTrendChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import {
  Refresh, Search, Money, Box, Document, WarningFilled,
  Top, Van, TrendCharts, ArrowDown, DataAnalysis
} from '@element-plus/icons-vue'
import { apiService } from '@/utils/api.js'
import FieldHelpPopover from './components/FieldHelpPopover.vue'

const router = useRouter()

// 数据状态
const loading = ref(false)
const tableLoading = ref(false)

// 概览数据
const overviewData = ref({
  sales1d: 0,
  sales3d: 0,
  sales7d: 0,
  units1d: 0,
  units3d: 0,
  units7d: 0,
  orders1d: 0,
  orders3d: 0,
  orders7d: 0,
  stockOutRiskSkuCount: 0,
  replenishSuggestedSkuCount: 0,
  inTransitSkuCount: 0
})

// 过滤条件
const filters = ref({
  search: '',
  replenishment: '',
  riskTag: '',
  hasInTransit: '',
  categoryId: ''
})

// 分类列表
const categoryList = ref([])

// 核心表数据
const coreTableData = ref([])
const currentPage = ref(1)
const pageSize = ref(50)
const totalCount = ref(0)

// 预警数据
const alertsData = ref({
  stockOutRisk: [],
  stockOutRiskStatus: 'ok',
  replenishSuggested: [],
  replenishSuggestedStatus: 'ok',
  highTrafficLowConversion: [],
  highTrafficLowConversionStatus: 'ok',
  avgSessions: 0,
  avgConversion: 0,
  alertsInfo: null
})

// 趋势数据
const trendData = ref({
  sales: [],
  amount: [],
  dates: []
})

// 图表引用
const salesTrendChartRef = ref(null)
const amountTrendChartRef = ref(null)
let salesTrendChart = null
let amountTrendChart = null

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

// 计算属性 - 固定按近7天销量排序
const sortField = 'sales_7days'

// 过滤后的核心表数据（后端已过滤，这里只做分页前的处理）
const filteredCoreTable = computed(() => {
  return coreTableData.value
})

// 加载概览数据
const loadOverview = async () => {
  try {
    const res = await apiService.cockpit.getOverview()
    if (res) {
      const cards = res.overviewCards || res
      overviewData.value = {
        sales1d: cards.sales1d || 0,
        sales3d: cards.sales3d || 0,
        sales7d: cards.sales7d || 0,
        units1d: cards.units1d || 0,
        units3d: cards.units3d || 0,
        units7d: cards.units7d || 0,
        orders1d: cards.orders1d || 0,
        orders3d: cards.orders3d || 0,
        orders7d: cards.orders7d || 0,
        stockOutRiskSkuCount: cards.stockOutRiskSkuCount || 0,
        replenishSuggestedSkuCount: cards.replenishSuggestedSkuCount || 0,
        inTransitSkuCount: cards.inTransitSkuCount || 0
      }
    }
  } catch (error) {
    console.error('加载概览数据失败:', error)
  }
}

// 加载核心表数据
const loadCoreTable = async () => {
  tableLoading.value = true
  try {
    const res = await apiService.cockpit.getCoreTable({
      page: currentPage.value,
      pageSize: pageSize.value,
      search: filters.value.search,
      replenishment: filters.value.replenishment,
      risk_tag: filters.value.riskTag,
      has_in_transit: filters.value.hasInTransit,
      category_id: filters.value.categoryId
    })
    if (res && res.list) {
      coreTableData.value = res.list
      totalCount.value = res.pagination?.total || res.list.length
    }
  } catch (error) {
    console.error('加载核心表失败:', error)
  } finally {
    tableLoading.value = false
  }
}

// 加载预警数据
const loadAlerts = async () => {
  try {
    const res = await apiService.cockpit.getAlerts()
    if (res) {
      alertsData.value = {
        stockOutRisk: res.stockOutRisk || [],
        stockOutRiskStatus: res.stockOutRiskStatus || 'ok',
        replenishSuggested: res.replenishSuggested || [],
        replenishSuggestedStatus: res.replenishSuggestedStatus || 'ok',
        highTrafficLowConversion: res.highTrafficLowConversion || [],
        highTrafficLowConversionStatus: res.highTrafficLowConversionStatus || 'ok',
        avgSessions: res.avgSessions || 0,
        avgConversion: res.avgConversion || 0,
        alertsInfo: res.alertsInfo || null
      }
    }
  } catch (error) {
    console.error('加载预警数据失败:', error)
  }
}

// 加载趋势数据
const loadTrends = async () => {
  try {
    const res = await apiService.cockpit.getTrends()
    if (res && res.dailyTrend) {
      trendData.value.sales = res.dailyTrend.map(item => item.units || 0)
      trendData.value.amount = res.dailyTrend.map(item => item.sales || 0)
      trendData.value.dates = res.dailyTrend.map(item => formatChartDate(item.date))

      nextTick(() => {
        renderSalesTrendChart()
        renderAmountTrendChart()
      })
    }
  } catch (error) {
    console.error('加载趋势数据失败:', error)
  }
}

// 渲染销量趋势图
const renderSalesTrendChart = () => {
  if (!salesTrendChartRef.value) return

  if (salesTrendChart) {
    salesTrendChart.dispose()
  }

  salesTrendChart = echarts.init(salesTrendChartRef.value)

  const option = {
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: trendData.value.dates || []
    },
    yAxis: {
      type: 'value',
      name: '销量'
    },
    series: [{
      name: '销量',
      type: 'line',
      data: trendData.value.sales || [],
      itemStyle: { color: '#67c23a' },
      smooth: true
    }]
  }

  salesTrendChart.setOption(option)
}

// 渲染销售额趋势图
const renderAmountTrendChart = () => {
  if (!amountTrendChartRef.value) return

  if (amountTrendChart) {
    amountTrendChart.dispose()
  }

  amountTrendChart = echarts.init(amountTrendChartRef.value)

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const item = params[0]
        return `${item.name}<br/>销售额: ¥${Number(item.value).toLocaleString()}`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: trendData.value.dates || []
    },
    yAxis: {
      type: 'value',
      name: '销售额(¥)'
    },
    series: [{
      name: '销售额',
      type: 'bar',
      data: trendData.value.amount || [],
      itemStyle: { color: '#409eff' }
    }]
  }

  amountTrendChart.setOption(option)
}

// 获取可售天数样式
const getDaysSupplyClass = (days) => {
  if (days === null || days === undefined) return ''
  if (days < 7) return 'days-danger'
  if (days < 14) return 'days-warning'
  return 'days-normal'
}

// 获取建议标签类型
const getSuggestionTagType = (type) => {
  switch (type) {
    case 'danger': return 'danger'
    case 'warning': return 'warning'
    case 'success': return 'success'
    default: return 'info'
  }
}

// 获取风险标签类型
const getRiskTagType = (type) => {
  switch (type) {
    case 'danger': return 'danger'
    case 'warning': return 'warning'
    case 'success': return 'success'
    default: return 'info'
  }
}

// 获取附加标签类型
const getExtraTagType = (type) => {
  switch (type) {
    case 'success': return 'success'
    case 'warning': return 'warning'
    case 'danger': return 'danger'
    default: return 'info'
  }
}

// 获取趋势样式
const getTrendClass = (trend) => {
  if (trend > 0) return 'trend-up'
  if (trend < 0) return 'trend-down'
  return 'trend-zero'
}

// 格式化趋势值
const formatTrend = (trend) => {
  if (trend === null || trend === undefined) return '-'
  const sign = trend > 0 ? '+' : ''
  return sign + trend.toFixed(1)
}

// 格式化图表日期标签
const formatChartDate = (dateStr) => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch (e) {
    return dateStr
  }
}

// 过滤条件变化
const handleFilterChange = () => {
  currentPage.value = 1
  loadCoreTable()
}

// 刷新所有数据
const refreshAll = async () => {
  loading.value = true
  try {
    await Promise.all([
      loadOverview(),
      loadCoreTable(),
      loadAlerts(),
      loadTrends()
    ])
    ElMessage.success('刷新成功')
  } catch (error) {
    ElMessage.error('刷新失败')
  } finally {
    loading.value = false
  }
}

// 分页
const handleSizeChange = (newSize) => {
  pageSize.value = newSize
  loadCoreTable()
}

const handleCurrentChange = (newPage) => {
  currentPage.value = newPage
  loadCoreTable()
}

// 操作下拉菜单
const handleActionCommand = (row, command) => {
  switch (command) {
    case 'business':
      jumpToBusiness(row.sku)
      break
    case 'orders':
      jumpToOrders(row.sku)
      break
    case 'fba':
      jumpToFba(row.sku)
      break
    case 'reserved':
      jumpToReserved(row.sku)
      break
    case 'logistics':
      jumpToLogistics(row.sku)
      break
  }
}

// 跳转函数
const jumpToBusiness = (sku) => {
  router.push({ path: '/business', query: { search: sku } })
}

const jumpToOrders = (sku) => {
  router.push({ path: '/orders/summary', query: { search: sku } })
}

const jumpToFba = (sku) => {
  router.push({ path: '/fba/inventory', query: { search: sku } })
}

const jumpToReserved = (sku) => {
  router.push({ path: '/fba/reserved', query: { search: sku } })
}

const jumpToLogistics = (sku) => {
  router.push({ path: '/logistics', query: { search: sku } })
}

// 加载分类列表
const loadCategories = async () => {
  try {
    const res = await apiService.category.getList({ page: 1, pageSize: 100 })
    if (res && res.list) {
      categoryList.value = res.list
    }
  } catch (error) {
    console.error('加载分类列表失败:', error)
  }
}

// 生命周期
onMounted(async () => {
  await Promise.all([
    loadOverview(),
    loadCoreTable(),
    loadAlerts(),
    loadTrends(),
    loadCategories()
  ])

  window.addEventListener('resize', () => {
    if (salesTrendChart) salesTrendChart.resize()
    if (amountTrendChart) amountTrendChart.resize()
  })
})

onBeforeUnmount(() => {
  if (salesTrendChart) salesTrendChart.dispose()
  if (amountTrendChart) amountTrendChart.dispose()
  window.removeEventListener('resize', () => {})
})
</script>

<style scoped>
.cockpit-container {
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

/* 概览卡片 */
.overview-cards {
  margin-bottom: 20px;
}

.page-note {
  font-size: 13px;
  color: #909399;
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
  border-radius: 4px;
  padding: 10px 16px;
  margin-bottom: 20px;
}

.overview-card {
  border: none;
  border-radius: 8px;
}

.overview-card .el-card__body {
  padding: 20px;
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
  background: #409eff20;
}

.card-icon .el-icon {
  font-size: 24px;
}

.card-info {
  flex: 1;
}

.card-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 4px;
}

.card-value {
  font-size: 22px;
  font-weight: bold;
  color: #303133;
}

.card-value.warning {
  color: #f56c6c;
}

.card-value.warning-text {
  color: #e6a23c;
}

/* 核心表 */
.core-table-section {
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
}

.product-name-cell {
  display: inline-block;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.numeric-cell {
  font-weight: 500;
  color: #303133;
}

.percentage-cell {
  color: #e6a23c;
  font-weight: 500;
}

.highlight-cell {
  color: #f56c6c;
  font-weight: bold;
}

.transit-cell {
  color: #909399;
}

.days-danger {
  color: #f56c6c;
  font-weight: bold;
}

.days-warning {
  color: #e6a23c;
  font-weight: 500;
}

.days-normal {
  color: #67c23a;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding: 20px 0;
}

/* 预警区 */
.alerts-section {
  margin-bottom: 20px;
}

.alert-card {
  border-radius: 8px;
}

.alert-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: bold;
}

.alert-card-header.danger {
  color: #f56c6c;
}

.alert-card-header.warning {
  color: #e6a23c;
}

.alert-list {
  max-height: 400px;
  overflow-y: auto;
}

.alert-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.alert-item:last-child {
  border-bottom: none;
}

.alert-item-left {
  display: flex;
  align-items: center;
}

.alert-rank {
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background: #f0f0f0;
  color: #606266;
  font-size: 12px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
}

.alert-sku {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}

.alert-name {
  font-size: 12px;
  color: #909399;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alert-item-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.alert-metric {
  text-align: right;
}

.metric-label {
  font-size: 11px;
  color: #909399;
}

.metric-value {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
}

.metric-value.danger {
  color: #f56c6c;
}

.metric-value.warning {
  color: #e6a23c;
}

.empty-alert {
  text-align: center;
  color: #909399;
  padding: 40px 0;
}

.alert-status-message {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 4px;
}

.alert-status-tip {
  font-size: 12px;
  color: #909399;
}

/* 趋势区 */
.trend-section {
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
  height: 250px;
  width: 100%;
}

@media (max-width: 1200px) {
  .overview-cards .el-col {
    margin-bottom: 16px;
  }

  .alerts-section .el-col {
    margin-bottom: 16px;
  }
}

/* 趋势样式 */
.trend-up {
  color: #67c23a;
  font-weight: 500;
}

.trend-down {
  color: #f56c6c;
  font-weight: 500;
}

.trend-zero {
  color: #909399;
}

/* 表头问号说明样式 */
.column-header-with-help {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  cursor: help;
  white-space: nowrap;
}

</style>