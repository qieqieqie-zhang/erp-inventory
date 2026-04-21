<template>
  <div class="fba-inventory-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>FBA库存健康分析</h2>
      <div class="header-actions">
        <el-button type="primary" :icon="Upload" @click="showUploadDialog">
          上传库存报告
        </el-button>
        <el-button :icon="Refresh" @click="refreshData">
          刷新
        </el-button>
        <el-button type="success" :icon="Download" @click="exportFilteredData">
          导出数据
        </el-button>
        <el-button type="warning" :icon="Warning" @click="viewAlerts">
          库存预警
        </el-button>
        <el-button type="danger" :icon="DeleteFilled" @click="deleteAll">
          删除全部
        </el-button>
      </div>
    </div>

    <!-- 库存健康概览 -->
    <div class="inventory-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="never" class="overview-card total-inventory">
            <div class="overview-item">
              <div class="overview-icon">
                <el-icon><Box /></el-icon>
              </div>
              <div class="overview-content">
                <div class="overview-value">{{ overviewData.totalAvailable || 0 }}</div>
                <div class="overview-label">可售库存总数</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card shadow="never" class="overview-card total-sales">
            <div class="overview-item">
              <div class="overview-icon">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="overview-content">
                <div class="overview-value">{{ overviewData.totalSales30Days || 0 }}</div>
                <div class="overview-label">近30天总销量</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card shadow="never" class="overview-card low-stock">
            <div class="overview-item">
              <div class="overview-icon">
                <el-icon><Warning /></el-icon>
              </div>
              <div class="overview-content">
                <div class="overview-value">{{ overviewData.outOfStockRisk || 0 }}</div>
                <div class="overview-label">断货风险商品</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card shadow="never" class="overview-card excess-stock">
            <div class="overview-item">
              <div class="overview-icon">
                <el-icon><Goods /></el-icon>
              </div>
              <div class="overview-content">
                <div class="overview-value">{{ formatNumber(overviewData.totalExcessQuantity || 0) }}</div>
                <div class="overview-label">预计过剩库存</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 第二行小卡片 -->
      <el-row :gutter="20" style="margin-top: 20px;">
        <el-col :span="6">
          <el-card shadow="never" class="overview-card-small">
            <div class="overview-item-small">
              <span class="overview-label-small">入库中库存</span>
              <span class="overview-value-small">{{ overviewData.totalInbound || 0 }}</span>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never" class="overview-card-small">
            <div class="overview-item-small">
              <span class="overview-label-small">不可售库存</span>
              <span class="overview-value-small">{{ overviewData.totalUnfulfillable || 0 }}</span>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never" class="overview-card-small">
            <div class="overview-item-small">
              <span class="overview-label-small">库龄风险商品</span>
              <span class="overview-value-small warning">{{ overviewData.ageRiskCount || 0 }}</span>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never" class="overview-card-small">
            <div class="overview-item-small">
              <span class="overview-label-small">下月预计仓储费</span>
              <span class="overview-value-small">${{ formatNumber(overviewData.totalStorageCost || 0) }}</span>
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
          <el-form-item label="库存状态">
            <el-select v-model="filterForm.stockStatus" placeholder="全部状态" clearable multiple collapse-tags>
              <el-option label="断货风险" value="断货风险" />
              <el-option label="库存偏紧" value="库存偏紧" />
              <el-option label="库存健康" value="库存健康" />
              <el-option label="库存偏多" value="库存偏多" />
              <el-option label="压货风险" value="压货风险" />
              <el-option label="无销量库存" value="无销量库存" />
              <el-option label="不可售异常" value="不可售异常" />
              <el-option label="库龄风险" value="库龄风险" />
              <el-option label="高库龄风险" value="高库龄风险" />
              <el-option label="有在途库存" value="有在途库存" />
              <el-option label="Out of stock" value="Out of stock" />
              <el-option label="Excess" value="Excess" />
              <el-option label="Low stock" value="Low stock" />
              <el-option label="Healthy" value="Healthy" />
            </el-select>
          </el-form-item>
          <el-form-item label="库龄(天)">
            <el-input-number
              v-model="filterForm.minAge"
              :min="0"
              :max="filterForm.maxAge || 365"
              placeholder="最小"
              controls-position="right"
              style="width: 100px;"
            />
            <span class="input-separator">-</span>
            <el-input-number
              v-model="filterForm.maxAge"
              :min="filterForm.minAge || 0"
              :max="365"
              placeholder="最大"
              controls-position="right"
              style="width: 100px;"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="resetFilter">重置</el-button>
            <el-button @click="toggleAdvancedFilter">
              高级筛选
              <el-icon><ArrowDown v-if="!showAdvancedFilter" /><ArrowUp v-else /></el-icon>
            </el-button>
          </el-form-item>
        </el-form>

        <!-- 高级筛选 -->
        <el-collapse-transition>
          <div v-show="showAdvancedFilter" class="advanced-filter">
            <el-form :model="advancedFilterForm" label-width="120px" :inline="true">
              <el-form-item label="ASIN/FNSKU">
                <el-input
                  v-model="advancedFilterForm.asinFnsku"
                  placeholder="输入ASIN或FNSKU"
                  clearable
                />
              </el-form-item>
              <el-form-item label="近30天有销量">
                <el-checkbox v-model="advancedFilterForm.hasSales30Days" />
              </el-form-item>
              <el-form-item label="近30天无销量">
                <el-checkbox v-model="advancedFilterForm.noSales30Days" />
              </el-form-item>
              <el-form-item label="需要补货">
                <el-checkbox v-model="advancedFilterForm.needReplenish" />
              </el-form-item>
              <el-form-item label="有在途库存">
                <el-checkbox v-model="advancedFilterForm.hasInbound" />
              </el-form-item>
              <el-form-item label="无在途库存">
                <el-checkbox v-model="advancedFilterForm.noInbound" />
              </el-form-item>
              <el-form-item label="预计过剩库存">
                <el-checkbox v-model="advancedFilterForm.hasExcess" />
              </el-form-item>
              <el-form-item label="有不可售库存">
                <el-checkbox v-model="advancedFilterForm.hasUnfulfillable" />
              </el-form-item>
              <el-form-item label="有保留库存">
                <el-checkbox v-model="advancedFilterForm.hasReserved" />
              </el-form-item>
              <el-form-item label="181天以上库龄">
                <el-checkbox v-model="advancedFilterForm.hasAged181Plus" />
              </el-form-item>
              <el-form-item label="271天以上库龄">
                <el-checkbox v-model="advancedFilterForm.hasAged271Plus" />
              </el-form-item>
              <el-form-item>
                <el-button @click="applyAdvancedFilter">应用筛选</el-button>
                <el-button @click="clearAdvancedFilter">清除高级</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-collapse-transition>
      </div>
    </el-card>

    <!-- 库存表格 -->
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
          <!-- 库存状态标签 -->
          <el-table-column
            prop="inventory_status"
            label="库存状态"
            width="180"
            fixed
          >
            <template #default="{ row }">
              <div class="inventory-tags">
                <el-tag
                  v-for="tag in row.inventoryTags || []"
                  :key="tag.label"
                  size="small"
                  :type="tag.type"
                  class="inventory-tag"
                >
                  {{ tag.label }}
                </el-tag>
              </div>
            </template>
          </el-table-column>

          <!-- SKU -->
          <el-table-column
            prop="sku"
            label="SKU"
            width="130"
            sortable
            fixed
          />

          <!-- 商品名称 -->
          <el-table-column
            prop="product_name"
            label="商品名称"
            min-width="200"
            show-overflow-tooltip
          />

          <!-- FNSKU -->
          <el-table-column
            prop="fnsku"
            label="FNSKU"
            width="100"
          />

          <!-- ASIN -->
          <el-table-column
            prop="asin"
            label="ASIN"
            width="120"
          />

          <!-- 可售库存 -->
          <el-table-column
            prop="available"
            label="可售库存"
            width="100"
            align="center"
            sortable
          >
            <template #default="{ row }">
              <span :class="getAvailableClass(row)">{{ row.available || 0 }}</span>
            </template>
          </el-table-column>

          <!-- 近7天销量 -->
          <el-table-column
            prop="units_shipped_t7"
            label="近7天销量"
            width="100"
            align="center"
            sortable
          />

          <!-- 近30天销量 -->
          <el-table-column
            prop="units_shipped_t30"
            label="近30天销量"
            width="100"
            align="center"
            sortable
          />

          <!-- 可售天数 -->
          <el-table-column
            prop="days_of_supply"
            label="可售天数"
            width="90"
            align="center"
            sortable
          >
            <template #default="{ row }">
              <span :class="getDaysOfSupplyClass(row)">{{ row.days_of_supply || 0 }}</span>
            </template>
          </el-table-column>

          <!-- 售出率 -->
          <el-table-column
            prop="sell_through"
            label="售出率"
            width="80"
            align="center"
            sortable
          >
            <template #default="{ row }">
              {{ row.sell_through ? (row.sell_through * 100).toFixed(2) + '%' : '-' }}
            </template>
          </el-table-column>

          <!-- 入库中库存 -->
          <el-table-column
            prop="inbound_quantity"
            label="入库中"
            width="90"
            align="center"
            sortable
          />

          <!-- 保留库存 -->
          <el-table-column
            prop="total_reserved_quantity"
            label="保留库存"
            width="90"
            align="center"
            sortable
          />

          <!-- 不可售库存 -->
          <el-table-column
            prop="unfulfillable_quantity"
            label="不可售"
            width="90"
            align="center"
            sortable
          >
            <template #default="{ row }">
              <span v-if="row.unfulfillable_quantity > 0" class="warning-text">
                {{ row.unfulfillable_quantity }}
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <!-- 预计过剩库存 -->
          <el-table-column
            prop="estimated_excess_quantity"
            label="预计过剩"
            width="90"
            align="center"
            sortable
          >
            <template #default="{ row }">
              <span v-if="row.estimated_excess_quantity > 0" class="danger-text">
                {{ row.estimated_excess_quantity }}
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <!-- 下月预计仓储费 -->
          <el-table-column
            prop="estimated_storage_cost_next_month"
            label="下月仓储费"
            width="100"
            align="right"
          >
            <template #default="{ row }">
              {{ row.estimated_storage_cost_next_month ? '$' + formatNumber(row.estimated_storage_cost_next_month) : '-' }}
            </template>
          </el-table-column>

          <!-- FBA库存健康状态 -->
          <el-table-column
            prop="fba_inventory_level_health_status"
            label="FBA健康状态"
            width="120"
          >
            <template #default="{ row }">
              <el-tag size="small" :type="getHealthStatusType(row.fba_inventory_level_health_status)">
                {{ row.fba_inventory_level_health_status || '-' }}
              </el-tag>
            </template>
          </el-table-column>

          <!-- 最后更新 -->
          <el-table-column
            prop="last_updated"
            label="最后更新"
            width="160"
            sortable
          >
            <template #default="{ row }">
              {{ formatDate(row.last_updated || row.snapshot_date) }}
            </template>
          </el-table-column>

          <!-- 操作 -->
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button type="text" size="small" @click="viewDetail(row)">
                详情
              </el-button>
              <el-button type="text" size="small" @click="createReplenishment(row)">
                补货
              </el-button>
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
                  <div class="inventory-tags">
                    <el-tag
                      v-for="tag in (item.inventoryTags || []).slice(0, 2)"
                      :key="tag.label"
                      size="small"
                      :type="tag.type"
                    >
                      {{ tag.label }}
                    </el-tag>
                  </div>
                </div>
              </template>

              <div class="card-content">
                <div class="product-name">{{ item.product_name }}</div>

                <div class="inventory-stats">
                  <div class="stat-item">
                    <span class="stat-label">可售:</span>
                    <span class="stat-value">{{ item.available || 0 }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">7天销量:</span>
                    <span class="stat-value">{{ item.units_shipped_t7 || 0 }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">30天销量:</span>
                    <span class="stat-value">{{ item.units_shipped_t30 || 0 }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">可售天数:</span>
                    <span class="stat-value" :class="getDaysOfSupplyClass(item)">{{ item.days_of_supply || 0 }}</span>
                  </div>
                </div>

                <div class="card-actions">
                  <el-button type="text" size="small" @click="viewDetail(item)">
                    详情
                  </el-button>
                  <el-button type="text" size="small" @click="createReplenishment(item)">
                    补货
                  </el-button>
                </div>
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
      title="上传FBA库存报告"
      :accept="'.xlsx,.xls,.csv,.txt'"
      :max-size="10"
      :show-shop-select="true"
      :upload-fn="apiService.fba.inventory.upload"
      @success="handleUploadSuccess"
    />

    <!-- 库存详情对话框 -->
    <InventoryDetail ref="inventoryDetailRef" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Upload,
  Refresh,
  Download,
  Box,
  Money,
  Warning,
  Clock,
  Grid,
  Menu,
  ArrowDown,
  ArrowUp,
  DeleteFilled,
  TrendCharts,
  Goods
} from '@element-plus/icons-vue'
import { apiService } from '../../utils/api'
import UploadDialog from '../../components/UploadDialog.vue'
import InventoryDetail from './components/InventoryDetail.vue'

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
  stockStatus: [],
  minAge: null,
  maxAge: null
})

const advancedFilterForm = ref({
  asinFnsku: '',
  hasSales30Days: false,
  noSales30Days: false,
  needReplenish: false,
  hasInbound: false,
  noInbound: false,
  hasExcess: false,
  hasUnfulfillable: false,
  hasReserved: false,
  hasAged181Plus: false,
  hasAged271Plus: false
})

const showAdvancedFilter = ref(false)

// 分页配置
const pagination = ref({
  currentPage: 1,
  pageSize: 50,
  total: 0
})

// 排序配置
const sortConfig = ref({
  prop: 'days_of_supply',
  order: 'ascending'
})

// 对话框控制
const uploadDialogVisible = ref(false)
const inventoryDetailRef = ref(null)

// 打开上传对话框
const showUploadDialog = () => {
  uploadDialogVisible.value = true
}

// 初始化加载数据
onMounted(() => {
  fetchInventoryList()
  fetchOverviewData()
})

// 解析数值
const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0
  return Number(String(value).replace(/[$,%]/g, '').replace(/,/g, '').trim()) || 0
}

// 格式化数字
const formatNumber = (value) => {
  if (value === undefined || value === null) return '0'
  return parseFloat(value).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// 格式化日期
const formatDate = (dateString) => {
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

// 获取库存状态标签
const getInventoryTags = (row) => {
  const tags = []
  const daysOfSupply = parseNumber(row.days_of_supply)
  const available = parseNumber(row.available)
  const unitsShippedT30 = parseNumber(row.units_shipped_t30)
  const estimatedExcess = parseNumber(row.estimated_excess_quantity)
  const weeksOfCoverT30 = parseNumber(row.weeks_of_cover_t30)
  const unfulfillable = parseNumber(row.unfulfillable_quantity)
  const totalReserved = parseNumber(row.total_reserved_quantity)
  const inbound = parseNumber(row.inbound_quantity)
  const fbaMinLevel = parseNumber(row.fba_minimum_inventory_level)
  const invAge181270 = parseNumber(row.inv_age_181_to_270_days)
  const invAge271365 = parseNumber(row.inv_age_271_to_365_days)
  const invAge365Plus = parseNumber(row.inv_age_456_plus_days)
  const fbaStatus = row.fba_inventory_level_health_status || ''

  // 规则1：断货风险
  if (daysOfSupply > 0 && daysOfSupply < 20 && unitsShippedT30 > 0) {
    tags.push({ label: '断货风险', type: 'danger' })
  }

  // 规则2：库存偏紧
  if (daysOfSupply >= 20 && daysOfSupply < 45 && unitsShippedT30 > 0) {
    tags.push({ label: '库存偏紧', type: 'warning' })
  }

  // 规则3：库存健康
  if (daysOfSupply >= 45 && daysOfSupply <= 90 && unitsShippedT30 > 0 && estimatedExcess <= 0) {
    tags.push({ label: '库存健康', type: 'success' })
  }

  // 规则4：库存偏多
  if (daysOfSupply > 90 && unitsShippedT30 > 0) {
    tags.push({ label: '库存偏多', type: 'warning' })
  }

  // 规则5：压货风险
  if (estimatedExcess > 0 || weeksOfCoverT30 > 12) {
    tags.push({ label: '压货风险', type: 'danger' })
  }

  // 规则6：无销量库存
  if (available > 0 && unitsShippedT30 === 0) {
    tags.push({ label: '无销量库存', type: 'info' })
  }

  // 规则7：不可售异常
  if (unfulfillable > 0) {
    tags.push({ label: '不可售异常', type: 'danger' })
  }

  // 规则8：保留库存偏高
  if (totalReserved > available * 0.5 && totalReserved > 10) {
    tags.push({ label: '保留库存偏高', type: 'warning' })
  }

  // 规则9：库龄风险
  if (invAge181270 + invAge271365 + invAge365Plus > 0) {
    tags.push({ label: '库龄风险', type: 'danger' })
  }

  // 规则10：高库龄风险
  if (invAge271365 + invAge365Plus > 0) {
    tags.push({ label: '高库龄风险', type: 'danger' })
  }

  // 规则11：有在途库存
  if (inbound > 0) {
    tags.push({ label: '有在途库存', type: 'primary' })
  }

  // 规则12：低于FBA最低库存
  if (fbaMinLevel > 0 && available < fbaMinLevel) {
    tags.push({ label: '低于FBA最低', type: 'warning' })
  }

  // 规则13：Out of stock
  if (fbaStatus.toLowerCase() === 'out of stock' || (available === 0 && unitsShippedT30 > 0)) {
    tags.push({ label: 'Out of stock', type: 'danger' })
  }

  // 规则14：Excess
  if (fbaStatus.toLowerCase() === 'excess' || estimatedExcess > 0) {
    tags.push({ label: 'Excess', type: 'danger' })
  }

  // 规则15：Low stock
  if (fbaStatus.toLowerCase() === 'low stock') {
    tags.push({ label: 'Low stock', type: 'warning' })
  }

  // 规则16：Healthy
  if (fbaStatus.toLowerCase() === 'healthy') {
    tags.push({ label: 'Healthy', type: 'success' })
  }

  return tags
}

// 生成运营建议
const generateOperationSuggestion = (row) => {
  const tags = (row.inventoryTags || []).map(t => t.label)
  const daysOfSupply = parseNumber(row.days_of_supply)
  const available = parseNumber(row.available)
  const unitsShippedT30 = parseNumber(row.units_shipped_t30)
  const inbound = parseNumber(row.inbound_quantity)
  const estimatedExcess = parseNumber(row.estimated_excess_quantity)
  const unfulfillable = parseNumber(row.unfulfillable_quantity)
  const totalReserved = parseNumber(row.total_reserved_quantity)

  if (tags.includes('断货风险') || tags.includes('Out of stock')) {
    if (inbound > 0) {
      return `当前可售库存较低，近30天销量为${unitsShippedT30}，预计可售${daysOfSupply}天，但已有${inbound}件在途库存。建议跟进入仓进度，避免断货。`
    } else {
      return `当前存在断货风险，近30天销量为${unitsShippedT30}，可售库存仅${available}，预计可售${daysOfSupply}天。建议立即安排补货。`
    }
  }

  if (tags.includes('压货风险') || tags.includes('Excess')) {
    return `当前存在压货风险，预计过剩库存为${estimatedExcess}件。建议减少补货，结合优惠券、降价或广告清货。`
  }

  if (tags.includes('无销量库存')) {
    return `当前SKU有库存但近30天无销量。建议检查Listing、价格、广告、评价和关键词流量，必要时做清货处理。`
  }

  if (tags.includes('库龄风险') || tags.includes('高库龄风险')) {
    return `当前SKU存在181天以上老库存，可能产生更高仓储成本。建议优先促销、降价、Outlet或移除库存。`
  }

  if (tags.includes('不可售异常')) {
    return `当前有${unfulfillable}件不可售库存。建议查看不可售原因，并决定重新上架、移除或弃置。`
  }

  if (tags.includes('保留库存偏高')) {
    return `当前保留库存为${totalReserved}件，占比较高。建议观察是否为订单占用、仓间调拨或仓内处理中。`
  }

  if (tags.includes('库存偏紧')) {
    return `当前库存偏紧，建议结合采购周期、头程周期和入仓时效安排补货。`
  }

  if (tags.includes('库存健康')) {
    return `当前库存状态较健康，可售库存、销量和可售天数处于相对合理区间。建议保持观察。`
  }

  return `暂无明显异常。建议结合广告数据、利润数据和补货周期进一步判断。`
}

// 计算衍生字段
const computeDerivedFields = (row) => {
  const available = parseNumber(row.available)
  const unitsShippedT7 = parseNumber(row.units_shipped_t7)
  const unitsShippedT30 = parseNumber(row.units_shipped_t30)
  const unitsShippedT90 = parseNumber(row.units_shipped_t90)
  const inbound = parseNumber(row.inbound_quantity)
  const invAge181270 = parseNumber(row.inv_age_181_to_270_days)
  const invAge271365 = parseNumber(row.inv_age_271_to_365_days)
  const invAge365Plus = parseNumber(row.inv_age_456_plus_days)

  // 日均销量
  row.daily_sales_t7 = unitsShippedT7 / 7
  row.daily_sales_t30 = unitsShippedT30 / 30
  row.daily_sales_t90 = unitsShippedT90 / 90

  // 销量趋势系数
  row.sales_trend_ratio = row.daily_sales_t30 > 0 ? row.daily_sales_t7 / row.daily_sales_t30 : 0

  // 含在途总库存
  row.total_available_with_inbound = available + inbound

  // 含在途可售天数
  row.estimated_cover_days_with_inbound = row.daily_sales_t30 > 0
    ? row.total_available_with_inbound / row.daily_sales_t30
    : 0

  // 181天以上库存
  row.aged_inventory_181_plus = invAge181270 + invAge271365 + invAge365Plus

  // 271天以上库存
  row.aged_inventory_271_plus = invAge271365 + invAge365Plus

  // 库存状态标签
  row.inventoryTags = getInventoryTags(row)

  // 运营建议
  row.operation_suggestion = generateOperationSuggestion(row)

  return row
}

// 获取库存列表
const fetchInventoryList = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.currentPage,
      pageSize: pagination.value.pageSize,
      sortField: sortConfig.value.prop,
      sortOrder: sortConfig.value.order === 'descending' ? 'desc' : 'asc'
    }

    if (filterForm.value.sku) {
      params.search = filterForm.value.sku
    }
    if (filterForm.value.productName) {
      params.productName = filterForm.value.productName
    }

    const data = await apiService.fba.inventory.getList(params)

    // 转换并计算字段
    inventoryList.value = (data.list || []).map(item => {
      // 映射字段名
      const mapped = {
        sku: item.seller_sku || item.sku,
        product_name: item.item_name || item.product_name,
        fnsku: item.fnsku,
        asin: item.asin,
        available: parseNumber(item.available_quantity || item.available),
        units_shipped_t7: parseNumber(item.units_shipped_t7 || item['units-shipped-t7']),
        units_shipped_t30: parseNumber(item.units_shipped_t30 || item['units-shipped-t30']),
        units_shipped_t60: parseNumber(item.units_shipped_t60 || item['units-shipped-t60']),
        units_shipped_t90: parseNumber(item.units_shipped_t90 || item['units-shipped-t90']),
        days_of_supply: parseNumber(item.days_of_supply || item['days-of-supply']),
        sell_through: parseNumber(item.sell_through || item['sell-through']),
        inbound_quantity: parseNumber(item.inbound_quantity || item['inbound-quantity']),
        total_reserved_quantity: parseNumber(item.total_reserved_quantity || item['Total Reserved Quantity']),
        unfulfillable_quantity: parseNumber(item.unfulfillable_quantity || item['unfulfillable-quantity']),
        estimated_excess_quantity: parseNumber(item.estimated_excess_quantity || item['estimated-excess-quantity']),
        estimated_storage_cost_next_month: parseNumber(item.estimated_storage_cost_next_month || item['estimated-storage-cost-next-month']),
        fba_inventory_level_health_status: item.fba_inventory_level_health_status || item['fba-inventory-level-health-status'],
        last_updated: item.last_updated || item.upload_time || item.snapshot_date,
        snapshot_date: item.snapshot_date,
        // 库龄字段
        inv_age_181_to_270_days: parseNumber(item['inv-age-181-to-270-days'] || item.inv_age_181_to_270_days),
        inv_age_271_to_365_days: parseNumber(item['inv-age-271-to-365-days'] || item.inv_age_271_to_365_days),
        inv_age_456_plus_days: parseNumber(item['inv-age-456-plus-days'] || item.inv_age_456_plus_days),
        // 原始数据保留
        _raw: item
      }

      // 计算衍生字段
      return computeDerivedFields(mapped)
    })

    // 前端筛选
    if (filterForm.value.stockStatus && filterForm.value.stockStatus.length > 0) {
      inventoryList.value = inventoryList.value.filter(item => {
        const itemTags = item.inventoryTags.map(t => t.label)
        return filterForm.value.stockStatus.some(status => itemTags.includes(status))
      })
    }

    // 高级筛选
    if (advancedFilterForm.value.asinFnsku) {
      const keyword = advancedFilterForm.value.asinFnsku.toLowerCase()
      inventoryList.value = inventoryList.value.filter(item =>
        (item.asin && item.asin.toLowerCase().includes(keyword)) ||
        (item.fnsku && item.fnsku.toLowerCase().includes(keyword))
      )
    }
    if (advancedFilterForm.value.hasSales30Days) {
      inventoryList.value = inventoryList.value.filter(item => item.units_shipped_t30 > 0)
    }
    if (advancedFilterForm.value.noSales30Days) {
      inventoryList.value = inventoryList.value.filter(item => item.units_shipped_t30 === 0 && item.available > 0)
    }
    if (advancedFilterForm.value.needReplenish) {
      inventoryList.value = inventoryList.value.filter(item => item.days_of_supply < 45 && item.units_shipped_t30 > 0)
    }
    if (advancedFilterForm.value.hasInbound) {
      inventoryList.value = inventoryList.value.filter(item => item.inbound_quantity > 0)
    }
    if (advancedFilterForm.value.noInbound) {
      inventoryList.value = inventoryList.value.filter(item => item.inbound_quantity === 0)
    }
    if (advancedFilterForm.value.hasExcess) {
      inventoryList.value = inventoryList.value.filter(item => item.estimated_excess_quantity > 0)
    }
    if (advancedFilterForm.value.hasUnfulfillable) {
      inventoryList.value = inventoryList.value.filter(item => item.unfulfillable_quantity > 0)
    }
    if (advancedFilterForm.value.hasReserved) {
      inventoryList.value = inventoryList.value.filter(item => item.total_reserved_quantity > 0)
    }
    if (advancedFilterForm.value.hasAged181Plus) {
      inventoryList.value = inventoryList.value.filter(item => item.aged_inventory_181_plus > 0)
    }
    if (advancedFilterForm.value.hasAged271Plus) {
      inventoryList.value = inventoryList.value.filter(item => item.aged_inventory_271_plus > 0)
    }

    pagination.value.total = inventoryList.value.length
  } catch (error) {
    ElMessage.error(error.message || '获取库存列表失败')
    inventoryList.value = []
  } finally {
    loading.value = false
  }
}

// 获取概览数据
const fetchOverviewData = async () => {
  try {
    const data = await apiService.fba.inventory.getStats()
    overviewData.value = {
      totalAvailable: data.total_available || 0,
      totalSales30Days: data.total_sales_30_days || 0,
      outOfStockRisk: data.out_of_stock_risk || 0,
      totalExcessQuantity: data.total_excess_quantity || 0,
      totalInbound: data.total_inbound || 0,
      totalUnfulfillable: data.total_unfulfillable || 0,
      ageRiskCount: data.age_risk_count || 0,
      totalStorageCost: data.total_storage_cost || 0
    }
  } catch (error) {
    console.error('获取概览数据失败:', error)
    overviewData.value = {}
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
    stockStatus: [],
    minAge: null,
    maxAge: null
  }
  clearAdvancedFilter()
  pagination.value.currentPage = 1
  fetchInventoryList()
}

// 高级筛选
const toggleAdvancedFilter = () => {
  showAdvancedFilter.value = !showAdvancedFilter.value
}

const applyAdvancedFilter = () => {
  pagination.value.currentPage = 1
  fetchInventoryList()
}

const clearAdvancedFilter = () => {
  advancedFilterForm.value = {
    asinFnsku: '',
    hasSales30Days: false,
    noSales30Days: false,
    needReplenish: false,
    hasInbound: false,
    noInbound: false,
    hasExcess: false,
    hasUnfulfillable: false,
    hasReserved: false,
    hasAged181Plus: false,
    hasAged271Plus: false
  }
  showAdvancedFilter.value = false
}

// 分页处理
const handleSizeChange = (size) => {
  pagination.value.pageSize = size
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

// 导出筛选后数据
const exportFilteredData = async () => {
  try {
    loading.value = true
    const blob = await apiService.fba.inventory.exportData('excel')

    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `FBA库存健康分析_${new Date().toISOString().split('T')[0]}.xlsx`
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

// 查看预警
const viewAlerts = () => {
  // 设置筛选条件为异常状态
  filterForm.value.stockStatus = [
    '断货风险', '压货风险', '库龄风险', '高库龄风险',
    '不可售异常', '无销量库存', '低于FBA最低'
  ]
  handleSearch()
}

// 上传成功后刷新数据
const handleUploadSuccess = () => {
  fetchInventoryList()
  fetchOverviewData()
}

// 商品操作
const viewDetail = (row) => {
  inventoryDetailRef.value.open(row)
}

const createReplenishment = (row) => {
  ElMessage.info(`补货功能：SKU=${row.sku}, ASIN=${row.asin}, 可售=${row.available}, 30天销量=${row.units_shipped_t30}, 可售天数=${row.days_of_supply}`)
}

// 删除全部
const deleteAll = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要删除所有FBA库存数据吗？此操作不可恢复！',
      '警告',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    loading.value = true
    await apiService.fba.inventory.deleteAll()
    ElMessage.success('删除成功')
    fetchInventoryList()
    fetchOverviewData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  } finally {
    loading.value = false
  }
}

// 样式辅助方法
const getAvailableClass = (row) => {
  if (row.available === 0) return 'danger-text'
  if (row.available < 10) return 'warning-text'
  return ''
}

const getDaysOfSupplyClass = (row) => {
  const days = row.days_of_supply || 0
  if (days === 0) return 'danger-text'
  if (days < 20) return 'danger-text'
  if (days < 45) return 'warning-text'
  if (days > 90) return 'warning-text'
  return ''
}

const getHealthStatusType = (status) => {
  if (!status) return 'info'
  const s = status.toLowerCase()
  if (s.includes('healthy')) return 'success'
  if (s.includes('low stock')) return 'warning'
  if (s.includes('excess') || s.includes('out of stock')) return 'danger'
  return 'info'
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

.overview-card.total-sales .overview-icon {
  background: linear-gradient(135deg, #67C23A, #95D475);
}

.overview-card.low-stock .overview-icon {
  background: linear-gradient(135deg, #E6A23C, #F3D19E);
}

.overview-card.excess-stock .overview-icon {
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
}

/* 小卡片样式 */
.overview-card-small {
  border-radius: 8px;
  border: none;
}

.overview-item-small {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
}

.overview-label-small {
  font-size: 14px;
  color: #909399;
}

.overview-value-small {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.overview-value-small.warning {
  color: #E6A23C;
}

.overview-value-small.danger {
  color: #F56C6C;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-container {
  padding: 20px;
}

.input-separator {
  margin: 0 8px;
  color: #C0C4CC;
}

.advanced-filter {
  margin-top: 20px;
  padding: 20px;
  background-color: #F5F7FA;
  border-radius: 4px;
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

/* 库存标签 */
.inventory-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.inventory-tag {
  margin: 2px;
}

/* 文字颜色 */
.danger-text {
  color: #F56C6C;
  font-weight: bold;
}

.warning-text {
  color: #E6A23C;
}

.success-text {
  color: #67C23A;
}

/* 卡片视图 */
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
  align-items: flex-start;
  gap: 8px;
}

.card-header .sku {
  font-weight: bold;
  color: #303133;
  font-size: 14px;
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
