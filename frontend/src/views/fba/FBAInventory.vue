<template>
  <div class="fba-inventory-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>FBA库存管理</h2>
      <div class="header-actions">
        <el-button type="primary" :icon="Upload" @click="showUploadDialog">
          上传库存报告
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
        <el-button type="danger" :icon="Delete" @click="deleteAll">
          删除全部
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
                <div class="overview-value">{{ overviewData.totalUnits || 0 }}</div>
                <div class="overview-label">总库存数量</div>
                <div class="overview-change">
                  <span :class="getTrendClass(overviewData.unitsChange)">
                    {{ formatPercentage(overviewData.unitsChange) }}
                  </span>
                  <span class="overview-hint">较上月</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card shadow="never" class="overview-card total-value">
            <div class="overview-item">
              <div class="overview-icon">
                <el-icon><Money /></el-icon>
              </div>
              <div class="overview-content">
                <div class="overview-value">¥{{ formatCurrency(overviewData.totalValue || 0) }}</div>
                <div class="overview-label">库存总价值</div>
                <div class="overview-change">
                  <span :class="getTrendClass(overviewData.valueChange)">
                    {{ formatPercentage(overviewData.valueChange) }}
                  </span>
                  <span class="overview-hint">较上月</span>
                </div>
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
                <div class="overview-value">{{ overviewData.lowStockCount || 0 }}</div>
                <div class="overview-label">低库存商品</div>
                <div class="overview-change">
                  <el-tag size="small" :type="overviewData.lowStockCount > 10 ? 'danger' : 'warning'">
                    {{ overviewData.lowStockCount > 0 ? '需补货' : '正常' }}
                  </el-tag>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card shadow="never" class="overview-card avg-age">
            <div class="overview-item">
              <div class="overview-icon">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="overview-content">
                <div class="overview-value">{{ overviewData.avgAgeDays || 0 }}天</div>
                <div class="overview-label">库龄平均值</div>
                <div class="overview-change">
                  <span :class="getAgeClass(overviewData.avgAgeDays)">
                    {{ getAgeStatus(overviewData.avgAgeDays) }}
                  </span>
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
          <el-form-item label="库存状态">
            <el-select v-model="filterForm.stockStatus" placeholder="全部状态" clearable>
              <el-option label="全部" value="" />
              <el-option label="正常" value="normal" />
              <el-option label="低库存" value="low" />
              <el-option label="缺货" value="out" />
              <el-option label="积压" value="overstock" />
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
            <el-form :model="advancedFilterForm" label-width="100px" :inline="true">
              <el-form-item label="仓库代码">
                <el-input
                  v-model="advancedFilterForm.warehouseCode"
                  placeholder="仓库代码"
                  clearable
                />
              </el-form-item>
              <el-form-item label="可售数量">
                <el-input-number
                  v-model="advancedFilterForm.minSellable"
                  :min="0"
                  placeholder="最小"
                  controls-position="right"
                  style="width: 100px;"
                />
                <span class="input-separator">-</span>
                <el-input-number
                  v-model="advancedFilterForm.maxSellable"
                  :min="advancedFilterForm.minSellable || 0"
                  placeholder="最大"
                  controls-position="right"
                  style="width: 100px;"
                />
              </el-form-item>
              <el-form-item label="预留数量">
                <el-input-number
                  v-model="advancedFilterForm.minReserved"
                  :min="0"
                  placeholder="最小"
                  controls-position="right"
                  style="width: 100px;"
                />
                <span class="input-separator">-</span>
                <el-input-number
                  v-model="advancedFilterForm.maxReserved"
                  :min="advancedFilterForm.minReserved || 0"
                  placeholder="最大"
                  controls-position="right"
                  style="width: 100px;"
                />
              </el-form-item>
              <el-form-item label="入库时间">
                <el-date-picker
                  v-model="advancedFilterForm.receivedDateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  value-format="YYYY-MM-DD"
                />
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
          <el-dropdown @command="handleColumnCommand" style="margin-left: 10px;">
            <el-button size="small">
              <el-icon><Operation /></el-icon> 列设置
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="col in columnOptions" :key="col.prop">
                  <el-checkbox
                    v-model="col.visible"
                    :label="col.label"
                    @change="handleColumnVisibilityChange(col)"
                  />
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
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
          <el-table-column
            v-if="visibleColumns.sku"
            prop="sku"
            label="SKU"
            width="120"
            sortable
            fixed
          />
          <el-table-column
            v-if="visibleColumns.product_name"
            prop="product_name"
            label="商品名称"
            min-width="200"
            show-overflow-tooltip
          />
          <el-table-column
            v-if="visibleColumns.fnsku"
            prop="fnsku"
            label="FNSKU"
            width="120"
          />
          <el-table-column
            v-if="visibleColumns.asin"
            prop="asin"
            label="ASIN"
            width="120"
          />
          <el-table-column
            v-if="visibleColumns.total_units"
            prop="total_units"
            label="库存数量"
            width="100"
            align="center"
            sortable
          >
            <template #default="{ row }">
              <el-tag size="small" :type="getStockTagType(row)">
                {{ row.total_units }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            v-if="visibleColumns.your_price"
            prop="your_price"
            label="单价(¥)"
            width="100"
            align="right"
            sortable
          >
            <template #default="{ row }">
              {{ formatCurrency(row.your_price) }}
            </template>
          </el-table-column>
          <el-table-column
            v-if="visibleColumns.sales_last_30_days"
            prop="sales_last_30_days"
            label="售出件数"
            width="100"
            align="center"
            sortable
          />
          <el-table-column
            v-if="visibleColumns.sales_amount"
            prop="sales_amount"
            label="售出金额(¥)"
            width="120"
            align="right"
            sortable
          >
            <template #default="{ row }">
              {{ formatCurrency(row.sales_amount) }}
            </template>
          </el-table-column>
          <el-table-column
            v-if="visibleColumns.fba_inventory_level_health_status"
            prop="fba_inventory_level_health_status"
            label="FBA库存健康状态"
            width="130"
          >
            <template #default="{ row }">
              <el-tag size="small" :type="getHealthStatusType(row.fba_inventory_level_health_status)">
                {{ row.fba_inventory_level_health_status || '-' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            v-if="visibleColumns.last_updated"
            prop="last_updated"
            label="最后更新"
            width="180"
            sortable
          >
            <template #default="{ row }">
              {{ formatDateTime(row.last_updated) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button type="text" size="small" @click="viewDetail(row)">
                详情
              </el-button>
              <el-button type="text" size="small" @click="createReplenishment(row)">
                补货
              </el-button>
              <el-dropdown @command="(command) => handleMoreCommand(row, command)" trigger="click">
                <el-button type="text" size="small">
                  更多 <el-icon><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="transfer">库存转移</el-dropdown-item>
                    <el-dropdown-item command="adjustment">库存调整</el-dropdown-item>
                    <el-dropdown-item command="history">历史记录</el-dropdown-item>
                    <el-dropdown-item command="export" divided>导出商品</el-dropdown-item>
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
                  <el-tag size="small" :type="getStockStatusType(item)">
                    {{ getStockStatusText(item) }}
                  </el-tag>
                </div>
              </template>
              
              <div class="card-content">
                <div class="product-name">{{ item.product_name }}</div>
                
                <div class="inventory-stats">
                  <div class="stat-item">
                    <span class="stat-label">总库存:</span>
                    <span class="stat-value">{{ item.total_units }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">单价:</span>
                    <span class="stat-value">{{ formatCurrency(item.your_price) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">售出件数:</span>
                    <span class="stat-value">{{ item.sales_last_30_days }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">售出金额:</span>
                    <span class="stat-value">{{ formatCurrency(item.sales_amount) }}</span>
                  </div>
                </div>

                <div class="additional-info">
                  <div class="info-item">
                    <el-icon><Location /></el-icon>
                    <span>{{ item.country || item.marketplace || '未知' }}</span>
                  </div>
                  <div class="info-item">
                    <el-icon><Clock /></el-icon>
                    <span :class="getAgeClass(item.inventory_age_days)">
                      库龄: {{ item.inventory_age_days }}天
                    </span>
                  </div>
                  <div class="info-item">
                    <el-icon><Money /></el-icon>
                    <span>价值: {{ formatCurrency(item.total_value) }}</span>
                  </div>
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

    <!-- 库存预警对话框 -->
    <el-dialog
      v-model="alertsDialogVisible"
      title="库存预警"
      width="800px"
    >
      <InventoryAlerts @close="alertsDialogVisible = false" />
    </el-dialog>

    <!-- 库存详情对话框 -->
    <InventoryDetail ref="inventoryDetailRef" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Upload,
  Refresh,
  Download,
  View,
  Box,
  Money,
  Warning,
  Clock,
  Grid,
  Menu,
  Operation,
  ArrowDown,
  ArrowUp,
  Location,
  Delete
} from '@element-plus/icons-vue'
import { apiService } from '../../utils/api'
import UploadDialog from '../../components/UploadDialog.vue'
import InventoryAlerts from './components/InventoryAlerts.vue'
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
  stockStatus: '',
  minAge: null,
  maxAge: null
})

const advancedFilterForm = ref({
  warehouseCode: '',
  minSellable: null,
  maxSellable: null,
  minReserved: null,
  maxReserved: null,
  receivedDateRange: []
})

const showAdvancedFilter = ref(false)

// 分页配置
const pagination = ref({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 排序配置
const sortConfig = ref({
  prop: 'last_updated',
  order: 'descending'
})

// 列设置
const columnOptions = ref([
  { prop: 'sku', label: 'SKU', visible: true },
  { prop: 'product_name', label: '商品名称', visible: true },
  { prop: 'fnsku', label: 'FNSKU', visible: true },
  { prop: 'asin', label: 'ASIN', visible: true },
  { prop: 'total_units', label: '库存数量', visible: true },
  { prop: 'your_price', label: '单价', visible: true },
  { prop: 'sales_last_30_days', label: '售出件数', visible: true },
  { prop: 'sales_amount', label: '售出金额', visible: true },
  { prop: 'fba_inventory_level_health_status', label: 'FBA库存健康状态', visible: true },
  { prop: 'country', label: '国家', visible: false },
  { prop: 'inventory_age_days', label: '库龄', visible: false },
  { prop: 'condition', label: '商品状况', visible: false },
  { prop: 'last_updated', label: '最后更新', visible: true }
])

const visibleColumns = computed(() => {
  const columns = {}
  columnOptions.value.forEach(col => {
    columns[col.prop] = col.visible
  })
  return columns
})

// 对话框控制
const uploadDialogVisible = ref(false)
const alertsDialogVisible = ref(false)
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

// 获取库存列表
const fetchInventoryList = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.currentPage,
      pageSize: pagination.value.pageSize,
      sku: filterForm.value.sku,
      productName: filterForm.value.productName,
      stockStatus: filterForm.value.stockStatus,
      minAge: filterForm.value.minAge,
      maxAge: filterForm.value.maxAge,
      sortField: sortConfig.value.prop,
      sortOrder: sortConfig.value.order === 'descending' ? 'desc' : 'asc'
    }
    
    // 添加高级筛选参数
    Object.assign(params, {
      warehouseCode: advancedFilterForm.value.warehouseCode,
      minSellable: advancedFilterForm.value.minSellable,
      maxSellable: advancedFilterForm.value.maxSellable,
      minReserved: advancedFilterForm.value.minReserved,
      maxReserved: advancedFilterForm.value.maxReserved,
      receivedStartDate: advancedFilterForm.value.receivedDateRange?.[0],
      receivedEndDate: advancedFilterForm.value.receivedDateRange?.[1]
    })
    
    const data = await apiService.fba.inventory.getList(params)
    // 转换API数据字段：total_units = available_quantity + reserved_fc_transfer
    inventoryList.value = (data.list || []).map(item => ({
      ...item,
      total_units: (item.available_quantity || 0) + (item.reserved_fc_transfer || 0),
      product_name: item.item_name || item.product_name || ''
    }))
    pagination.value.total = data.pagination?.total || 0
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
    overviewData.value = data || {}
  } catch (error) {
    console.error('获取概览数据失败:', error)
    overviewData.value = {
      totalUnits: 1580,
      totalValue: 425000,
      lowStockCount: 12,
      avgAgeDays: 45,
      unitsChange: 0.12,
      valueChange: 0.18
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
    stockStatus: '',
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
    warehouseCode: '',
    minSellable: null,
    maxSellable: null,
    minReserved: null,
    maxReserved: null,
    receivedDateRange: []
  }
  showAdvancedFilter.value = false
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

// 列设置处理
const handleColumnCommand = (command) => {
  // 处理列设置命令
}

const handleColumnVisibilityChange = (col) => {
  // 保存列设置到本地存储
  localStorage.setItem(`fba_inventory_columns_${col.prop}`, col.visible)
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
    const blob = await apiService.fba.inventory.exportData('excel')
    
    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `FBA库存数据_${new Date().toISOString().split('T')[0]}.xlsx`
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
  alertsDialogVisible.value = true
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
  ElMessage.info('补货功能开发中')
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

const handleMoreCommand = (row, command) => {
  switch (command) {
    case 'transfer':
      ElMessage.info('库存转移功能开发中')
      break
    case 'adjustment':
      ElMessage.info('库存调整功能开发中')
      break
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
  a.download = `FBA库存_${row.sku}_${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
  ElMessage.success('导出成功')
}

// 工具方法
const formatCurrency = (value) => {
  if (value === undefined || value === null) return '0.00'
  return parseFloat(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const formatPercentage = (value) => {
  if (value === undefined || value === null) return '0.00%'
  return `${(value * 100).toFixed(2)}%`
}

const formatDateTime = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getTrendClass = (change) => {
  if (change > 0) return 'positive-trend'
  if (change < 0) return 'negative-trend'
  return 'neutral-trend'
}

const getAgeClass = (age) => {
  if (age > 90) return 'age-high'
  if (age > 60) return 'age-medium'
  return 'age-low'
}

const getAgeStatus = (age) => {
  if (age > 90) return '积压'
  if (age > 60) return '偏高'
  return '正常'
}

const getStockTagType = (row) => {
  const available = row.available_quantity || 0
  if (available === 0) return 'danger'
  if (available < 10) return 'warning'
  return 'success'
}

const getConditionType = (condition) => {
  const typeMap = {
    '全新': 'success',
    '二手': 'warning',
    '损坏': 'danger'
  }
  return typeMap[condition] || 'info'
}

const getHealthStatusType = (status) => {
  if (!status) return 'info'
  const statusLower = status.toLowerCase()
  if (statusLower.includes('healthy') || statusLower.includes('正常')) return 'success'
  if (statusLower.includes('low stock') || statusLower.includes('低库存')) return 'warning'
  if (statusLower.includes('excess') || statusLower.includes('积压')) return 'danger'
  if (statusLower.includes('out of stock') || statusLower.includes('缺货')) return 'danger'
  return 'info'
}

const getStockStatusType = (item) => {
  if ((item.available_quantity || 0) === 0) return 'danger'
  if ((item.available_quantity || 0) < 10) return 'warning'
  return 'success'
}

const getStockStatusText = (item) => {
  if ((item.available_quantity || 0) === 0) return '缺货'
  if ((item.available_quantity || 0) < 10) return '低库存'
  return '正常'
}
</script>

<style scoped>
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

.overview-card.total-value .overview-icon {
  background: linear-gradient(135deg, #67C23A, #95D475);
}

.overview-card.low-stock .overview-icon {
  background: linear-gradient(135deg, #E6A23C, #F3D19E);
}

.overview-card.avg-age .overview-icon {
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

.positive-trend {
  color: #67C23A;
}

.negative-trend {
  color: #F56C6C;
}

.neutral-trend {
  color: #909399;
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

.age-high {
  color: #F56C6C;
  font-weight: bold;
}

.age-medium {
  color: #E6A23C;
  font-weight: bold;
}

.age-low {
  color: #67C23A;
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