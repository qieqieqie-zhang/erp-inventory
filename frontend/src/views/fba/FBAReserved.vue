<template>
  <div class="fba-reserved-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>FBA预留库存管理</h2>
      <div class="header-actions">
        <el-button type="primary" :icon="Upload" @click="showUploadDialog">
          上传预留库存报告
        </el-button>
        <el-button type="danger" :icon="Delete" @click="handleClearAll">
          清空列表
        </el-button>
        <el-button :icon="Refresh" @click="refreshData">
          刷新
        </el-button>
        <el-button type="success" :icon="Download" @click="exportData">
          导出数据
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
                <div class="overview-value">{{ formatNumber(statsData.total_reserved_qty || 0) }}</div>
                <div class="overview-label">报告预留总数</div>
                <div class="overview-hint">件</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card shadow="never" class="overview-card customer-orders">
            <div class="overview-item">
              <div class="overview-icon">
                <el-icon><User /></el-icon>
              </div>
              <div class="overview-content">
                <div class="overview-value">{{ formatNumber(statsData.total_customerorders || 0) }}</div>
                <div class="overview-label">客户订单预留</div>
                <div class="overview-hint">件</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card shadow="never" class="overview-card fc-transfers">
            <div class="overview-item">
              <div class="overview-icon">
                <el-icon><Connection /></el-icon>
              </div>
              <div class="overview-content">
                <div class="overview-value">{{ formatNumber(statsData.total_fc_transfers || 0) }}</div>
                <div class="overview-label">仓间调拨预留</div>
                <div class="overview-hint">件</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card shadow="never" class="overview-card fc-processing">
            <div class="overview-item">
              <div class="overview-icon">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="overview-content">
                <div class="overview-value">{{ formatNumber(statsData.total_fc_processing || 0) }}</div>
                <div class="overview-label">仓内处理预留</div>
                <div class="overview-hint">件</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 数据一致性提示 -->
      <div v-if="statsData.data_warning" class="data-warning">
        <el-alert type="warning" :closable="false" show-icon>
          <template #title>
            <strong>预留原因明细合计：{{ formatNumber(statsData.detail_total || 0) }} 件</strong>
          </template>
          <template #default>
            {{ statsData.data_warning }}
          </template>
        </el-alert>
      </div>
    </div>

    <!-- 筛选条件 -->
    <el-card shadow="never" class="filter-card">
      <div class="filter-container">
        <el-form :model="filterForm" :inline="true">
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
          <el-form-item label="ASIN搜索">
            <el-input
              v-model="filterForm.asin"
              placeholder="输入ASIN"
              clearable
              @keyup.enter="handleSearch"
              @clear="handleSearch"
            />
          </el-form-item>
          <el-form-item label="预留原因">
            <el-select v-model="filterForm.reasonFilter" placeholder="全部" clearable>
              <el-option label="全部" value="" />
              <el-option label="客户订单预留" value="customer_orders" />
              <el-option label="仓间调拨中" value="fc_transfers" />
              <el-option label="仓内处理中" value="fc_processing" />
              <el-option label="高调拨占比" value="high_transfer_ratio" />
              <el-option label="高处理占比" value="high_processing_ratio" />
            </el-select>
          </el-form-item>
          <el-form-item label="数据状态">
            <el-select v-model="filterForm.dataStatusFilter" placeholder="全部" clearable>
              <el-option label="全部" value="" />
              <el-option label="数据一致" value="consistent" />
              <el-option label="报告口径差异" value="inconsistent" />
              <el-option label="无明细原因" value="no_detail" />
              <el-option label="无预留" value="no_reserved" />
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
      </div>

      <!-- 表格视图 -->
      <el-table
        :data="inventoryList"
        v-loading="loading"
        style="width: 100%"
        stripe
        border
      >
        <el-table-column prop="reserved_tags" label="预留状态" width="220" fixed>
          <template #header>
            <span class="header-with-help">
              预留状态
              <ReservedStatusHelp />
            </span>
          </template>
          <template #default="{ row }">
            <div class="reserved-tags-container">
              <el-tag
                v-for="tag in getDisplayTags(row.reserved_tags || [])"
                :key="tag.label"
                size="small"
                :type="getTagType(tag.type)"
                class="reserved-tag"
              >
                {{ tag.label }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="sku" label="SKU" width="130" sortable fixed />
        <el-table-column prop="product_name" label="商品名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="asin" label="ASIN" width="120" />
        <el-table-column prop="reserved_qty" label="报告预留总数" width="120" align="center" sortable>
          <template #default="{ row }">
            <el-tag size="small" type="warning">{{ formatNumber(row.reserved_qty || 0) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reserved_customerorders" label="客户订单预留" width="120" align="center">
          <template #header>
            <span>客户订单预留</span>
            <el-popover trigger="hover" placement="top">
              <template #reference>
                <el-icon class="header-help-icon"><QuestionFilled /></el-icon>
              </template>
              <div class="field-help">
                <div class="field-help-title">客户订单预留</div>
                <div class="field-help-content">
                  <p><strong>CSV字段：</strong>reserved_customerorders</p>
                  <p><strong>含义：</strong>被客户订单占用的库存数量。</p>
                  <p><strong>用途：</strong>通常表示等待付款、拣货或发货完成。</p>
                  <p><strong>注意：</strong>这部分库存一般不应作为未来可售库存计算。</p>
                </div>
              </div>
            </el-popover>
          </template>
          <template #default="{ row }">
            <span>{{ formatNumber(row.reserved_customerorders || 0) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="reserved_fc_transfers" label="仓间调拨预留" width="120" align="center">
          <template #header>
            <span>仓间调拨预留</span>
            <el-popover trigger="hover" placement="top">
              <template #reference>
                <el-icon class="header-help-icon"><QuestionFilled /></el-icon>
              </template>
              <div class="field-help">
                <div class="field-help-title">仓间调拨预留</div>
                <div class="field-help-content">
                  <p><strong>CSV字段：</strong>reserved_fc-transfers</p>
                  <p><strong>含义：</strong>正在亚马逊运营中心之间调拨的库存数量。</p>
                  <p><strong>用途：</strong>用于判断available偏低是否只是亚马逊调仓导致。</p>
                  <p><strong>注意：</strong>它不是入库中库存，也不是不可售库存，通常未来可能释放。</p>
                </div>
              </div>
            </el-popover>
          </template>
          <template #default="{ row }">
            <span>{{ formatNumber(row.reserved_fc_transfers || 0) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="reserved_fc_processing" label="仓内处理预留" width="120" align="center">
          <template #header>
            <span>仓内处理预留</span>
            <el-popover trigger="hover" placement="top">
              <template #reference>
                <el-icon class="header-help-icon"><QuestionFilled /></el-icon>
              </template>
              <div class="field-help">
                <div class="field-help-title">仓内处理预留</div>
                <div class="field-help-content">
                  <p><strong>CSV字段：</strong>reserved_fc-processing</p>
                  <p><strong>含义：</strong>在亚马逊仓库内部处理中库存。</p>
                  <p><strong>用途：</strong>可能涉及接收、测量、分拣、调查或移除流程。</p>
                  <p><strong>注意：</strong>如果长期不释放，需要关注或联系亚马逊支持。</p>
                </div>
              </div>
            </el-popover>
          </template>
          <template #default="{ row }">
            <span>{{ formatNumber(row.reserved_fc_processing || 0) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="recoverable_reserved_qty" label="可恢复预留" width="110" align="center">
          <template #header>
            <span>可恢复预留</span>
            <el-popover trigger="hover" placement="top">
              <template #reference>
                <el-icon class="header-help-icon"><QuestionFilled /></el-icon>
              </template>
              <div class="field-help">
                <div class="field-help-title">可恢复预留</div>
                <div class="field-help-content">
                  <p><strong>系统字段：</strong>recoverable_reserved_qty</p>
                  <p><strong>公式：</strong>reserved_fc_transfers + reserved_fc_processing</p>
                  <p><strong>含义：</strong>仓间调拨预留和仓内处理预留的合计，代表未来可能释放回可售或履约网络的库存。</p>
                  <p><strong>用途：</strong>用于补货判断。available偏低时，如果可恢复预留较高，不应仅凭可售库存低就马上补货。</p>
                  <p><strong>注意：</strong>不包含客户订单预留，因为客户订单预留通常已经被订单占用，不应作为未来可卖库存计算。</p>
                </div>
              </div>
            </el-popover>
          </template>
          <template #default="{ row }">
            <span class="text-primary">{{ formatNumber(row.recoverable_reserved_qty || 0) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="text" size="small" @click="viewDetails(row)">
              详情
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
      title="上传FBA预留库存报告"
      :accept="'.xlsx,.xls,.csv,.txt'"
      :max-size="10"
      :show-shop-select="true"
      :upload-fn="apiService.fba.reserved.upload"
      @success="handleUploadSuccess"
    />

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="currentDetail?.sku + ' - 预留库存详情'"
      width="750px"
    >
      <div class="detail-container" v-if="currentDetail">
        <!-- 顶部摘要区 -->
        <div class="detail-summary">
          <div class="summary-header">
            <div class="summary-item">
              <span class="label">SKU:</span>
              <span class="value">{{ currentDetail.sku }}</span>
            </div>
            <div class="summary-item">
              <span class="label">ASIN:</span>
              <span class="value">{{ currentDetail.asin }}</span>
            </div>
            <div class="summary-item">
              <span class="label">FNSKU:</span>
              <span class="value">{{ currentDetail.fnsku }}</span>
            </div>
          </div>
          <div class="summary-product">
            <span class="product-name">{{ currentDetail.product_name }}</span>
          </div>
          <div class="summary-tags">
            <span class="summary-tags-label">预留状态：</span>
            <el-tag
              v-for="tag in (currentDetail.reserved_tags || [])"
              :key="tag.label"
              size="small"
              :type="getTagType(tag.type)"
            >
              {{ tag.label }}
            </el-tag>
            <ReservedStatusHelp />
          </div>
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-label">报告预留总数</span>
              <span class="stat-value">{{ formatNumber(currentDetail.reserved_qty || 0) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">客户订单预留</span>
              <span class="stat-value">{{ formatNumber(currentDetail.reserved_customerorders || 0) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">仓间调拨预留</span>
              <span class="stat-value">{{ formatNumber(currentDetail.reserved_fc_transfers || 0) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">仓内处理预留</span>
              <span class="stat-value">{{ formatNumber(currentDetail.reserved_fc_processing || 0) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">可恢复预留</span>
              <span class="stat-value text-primary">{{ formatNumber(currentDetail.recoverable_reserved_qty || 0) }}</span>
            </div>
          </div>
        </div>

        <!-- 预留原因拆解 -->
        <div class="reason-breakdown">
          <div class="breakdown-title">预留原因拆解</div>
          <el-row :gutter="16">
            <el-col :span="6">
              <div class="breakdown-card customer-orders">
                <div class="breakdown-value">{{ formatNumber(currentDetail.reserved_customerorders || 0) }}</div>
                <div class="breakdown-label">客户订单预留</div>
                <div class="breakdown-ratio">
                  占比：{{ ((currentDetail.customer_order_ratio || 0) * 100).toFixed(1) }}%
                </div>
                <el-progress
                  :percentage="((currentDetail.customer_order_ratio || 0) * 100)"
                  :stroke-width="8"
                  :color="'#409EFF'"
                />
              </div>
            </el-col>
            <el-col :span="6">
              <div class="breakdown-card fc-transfers">
                <div class="breakdown-value">{{ formatNumber(currentDetail.reserved_fc_transfers || 0) }}</div>
                <div class="breakdown-label">仓间调拨预留</div>
                <div class="breakdown-ratio">
                  占比：{{ ((currentDetail.fc_transfer_ratio || 0) * 100).toFixed(1) }}%
                </div>
                <el-progress
                  :percentage="((currentDetail.fc_transfer_ratio || 0) * 100)"
                  :stroke-width="8"
                  :color="'#67C23A'"
                />
              </div>
            </el-col>
            <el-col :span="6">
              <div class="breakdown-card fc-processing">
                <div class="breakdown-value">{{ formatNumber(currentDetail.reserved_fc_processing || 0) }}</div>
                <div class="breakdown-label">仓内处理预留</div>
                <div class="breakdown-ratio">
                  占比：{{ ((currentDetail.fc_processing_ratio || 0) * 100).toFixed(1) }}%
                </div>
                <el-progress
                  :percentage="((currentDetail.fc_processing_ratio || 0) * 100)"
                  :stroke-width="8"
                  :color="'#E6A23C'"
                />
              </div>
            </el-col>
            <el-col :span="6">
              <div class="breakdown-card recoverable">
                <div class="breakdown-value">{{ formatNumber(currentDetail.recoverable_reserved_qty || 0) }}</div>
                <div class="breakdown-label">可恢复预留</div>
                <div class="breakdown-ratio">
                  公式：仓间+仓内
                </div>
                <el-progress
                  :percentage="100"
                  :stroke-width="8"
                  :color="'#909399'"
                  :show-text="false"
                />
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- 数据校验说明 -->
        <div class="data-validation-section">
          <div class="section-title">
            <el-icon><Warning /></el-icon>
            数据校验说明
          </div>
          <el-descriptions :column="3" border size="small">
            <el-descriptions-item label="报告预留总数">
              {{ formatNumber(currentDetail.reserved_qty || 0) }}
            </el-descriptions-item>
            <el-descriptions-item label="预留原因明细合计">
              {{ formatNumber(currentDetail.reserved_detail_total || 0) }}
            </el-descriptions-item>
            <el-descriptions-item label="差异">
              <span :class="currentDetail.reserved_difference !== 0 ? 'text-danger' : ''">
                {{ currentDetail.reserved_difference || 0 }}
              </span>
            </el-descriptions-item>
          </el-descriptions>
          <div class="validation-note">
            <p>预留原因明细合计 = 客户订单预留 + 仓间调拨预留 + 仓内处理预留。</p>
            <p>差异 = 报告预留总数 - 预留原因明细合计。</p>
            <p v-if="currentDetail.reserved_difference !== 0" class="warning-text">
              如果差异不为0，说明亚马逊报告中的总预留口径与原因明细口径存在差异，不代表系统计算错误。
            </p>
          </div>
        </div>

        <!-- 运营建议 -->
        <div v-if="(currentDetail.operational_suggestion || []).length > 0" class="suggestion-box">
          <div class="suggestion-title">
            <el-icon><InfoFilled /></el-icon>
            运营建议
          </div>
          <div
            v-for="(suggestion, index) in currentDetail.operational_suggestion"
            :key="index"
            class="suggestion-item"
          >
            {{ suggestion }}
          </div>
        </div>

        <!-- 全部原始字段 -->
        <div class="raw-fields">
          <el-divider content-position="left">全部原始字段</el-divider>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="SKU">{{ currentDetail.sku }}</el-descriptions-item>
            <el-descriptions-item label="FNSKU">{{ currentDetail.fnsku }}</el-descriptions-item>
            <el-descriptions-item label="ASIN">{{ currentDetail.asin }}</el-descriptions-item>
            <el-descriptions-item label="商品名称">{{ currentDetail.product_name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="报告预留总数">{{ currentDetail.reserved_qty }}</el-descriptions-item>
            <el-descriptions-item label="客户订单预留">{{ currentDetail.reserved_customerorders }}</el-descriptions-item>
            <el-descriptions-item label="仓间调拨预留">{{ currentDetail.reserved_fc_transfers }}</el-descriptions-item>
            <el-descriptions-item label="仓内处理预留">{{ currentDetail.reserved_fc_processing }}</el-descriptions-item>
            <el-descriptions-item label="Program">{{ currentDetail.program || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Upload,
  Delete,
  Refresh,
  Download,
  Box,
  User,
  Connection,
  Clock,
  QuestionFilled,
  InfoFilled,
  Warning
} from '@element-plus/icons-vue'
import { apiService } from '../../utils/api'
import UploadDialog from '../../components/UploadDialog.vue'
import ReservedStatusHelp from '../../components/fba/ReservedStatusHelp.vue'

// 数据状态
const loading = ref(false)
const inventoryList = ref([])
const statsData = ref({})

// 筛选表单
const filterForm = reactive({
  sku: '',
  productName: '',
  asin: '',
  reasonFilter: '',
  dataStatusFilter: ''
})

// 分页配置
const pagination = ref({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 对话框控制
const uploadDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const currentDetail = ref(null)

// 初始化加载数据
onMounted(() => {
  fetchInventoryList()
  fetchStatsData()
})

// 获取库存列表
const fetchInventoryList = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.currentPage,
      pageSize: pagination.value.pageSize,
      search: filterForm.sku || filterForm.productName,
      asinSearch: filterForm.asin,
      reasonFilter: filterForm.reasonFilter,
      dataStatusFilter: filterForm.dataStatusFilter
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

// 获取统计数据
const fetchStatsData = async () => {
  try {
    const data = await apiService.fba.reserved.getStats()
    statsData.value = data || {}
  } catch (error) {
    console.error('获取统计数据失败:', error)
    statsData.value = {}
  }
}

// 搜索处理
const handleSearch = () => {
  pagination.value.currentPage = 1
  fetchInventoryList()
}

// 重置筛选
const resetFilter = () => {
  filterForm.sku = ''
  filterForm.productName = ''
  filterForm.asin = ''
  filterForm.reasonFilter = ''
  filterForm.dataStatusFilter = ''
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

// 刷新数据
const refreshData = () => {
  fetchInventoryList()
  fetchStatsData()
}

// 清空所有数据
const handleClearAll = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有FBA预留库存数据吗？此操作不可恢复。',
      '清空确认',
      {
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    loading.value = true
    await apiService.fba.reserved.deleteAll()
    ElMessage.success('清空成功')
    fetchInventoryList()
    fetchStatsData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '清空失败')
    }
  } finally {
    loading.value = false
  }
}

// 导出数据
const exportData = async () => {
  try {
    loading.value = true
    ElMessage.info('正在导出数据...')
    await apiService.fba.reserved.exportData('csv')
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error(error.message || '导出失败')
  } finally {
    loading.value = false
  }
}

// 上传成功后刷新数据
const handleUploadSuccess = () => {
  fetchInventoryList()
  fetchStatsData()
}

// 查看详情
const viewDetails = async (row) => {
  try {
    const data = await apiService.fba.reserved.getDetail(row.sku)
    currentDetail.value = data
    detailDialogVisible.value = true
  } catch (error) {
    ElMessage.error(error.message || '获取详情失败')
  }
}

// 工具方法
const formatNumber = (num) => {
  return num?.toLocaleString() || '0'
}

const getTagType = (type) => {
  const map = {
    'blue': '',
    'cyan': 'success',
    'orange': 'warning',
    'purple': 'purple',
    'warning': 'warning',
    'danger': 'danger',
    'info': 'info',
    'gray': 'info'
  }
  return map[type] || 'info'
}

// 列表展示用的标签（过滤掉报告口径差异，它只在详情展示）
const getDisplayTags = (tags) => {
  return tags.filter(tag => tag.label !== '报告口径差异')
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

.overview-card.fc-transfers .overview-icon {
  background: linear-gradient(135deg, #E6A23C, #F3D19E);
}

.overview-card.fc-processing .overview-icon {
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
  margin-bottom: 2px;
}

.overview-hint {
  font-size: 12px;
  color: #C0C4CC;
}

.data-warning {
  margin-top: 12px;
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

.pagination-container {
  padding: 20px 0;
  text-align: right;
}

.header-help-icon {
  margin-left: 4px;
  color: #909399;
  cursor: pointer;
  font-size: 12px;
  vertical-align: middle;
}

.header-help-icon:hover {
  color: #409EFF;
}

.mr-2 {
  margin-right: 4px;
}

.mb-2 {
  margin-bottom: 4px;
}

.reserved-tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 200px;
}

.reserved-tag {
  flex-shrink: 0;
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-danger {
  color: #F56C6C;
  font-weight: bold;
}

.field-help {
  padding: 4px 0;
  max-width: 320px;
}

.field-help-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.field-help-content p {
  margin: 4px 0;
  font-size: 12px;
  color: #606266;
  line-height: 1.5;
}

/* 详情弹窗样式 */
.detail-container {
  line-height: 1.6;
}

.detail-summary {
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.summary-header {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
}

.summary-item {
  font-size: 14px;
}

.summary-item .label {
  color: #909399;
}

.summary-item .value {
  font-weight: bold;
  color: #303133;
  margin-left: 4px;
}

.summary-product {
  margin-bottom: 12px;
}

.product-name {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  align-items: center;
}

.summary-tags-label {
  font-weight: 600;
  color: #606266;
  font-size: 14px;
}

.summary-stats {
  display: flex;
  gap: 24px;
  padding: 12px 0;
  border-top: 1px solid #dcdfe6;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-item .stat-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-item .stat-value {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.stat-item .stat-value.text-danger {
  color: #F56C6C;
}

.reason-breakdown {
  margin-bottom: 20px;
}

.breakdown-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.breakdown-card {
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}

.breakdown-card.customer-orders {
  background: #ecf5ff;
}

.breakdown-card.fc-transfers {
  background: #f0f9eb;
}

.breakdown-card.fc-processing {
  background: #fdf6ec;
}

.breakdown-card.recoverable {
  background: #f4f4f5;
}

.breakdown-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.breakdown-label {
  font-size: 12px;
  color: #606266;
  margin-bottom: 8px;
}

.breakdown-ratio {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.suggestion-box {
  margin-bottom: 20px;
  padding: 12px 16px;
  background: #f4f4f5;
  border-radius: 6px;
  border-left: 4px solid #909399;
}

.suggestion-title {
  display: flex;
  align-items: center;
}

.data-validation-section {
  margin-bottom: 20px;
  padding: 12px 16px;
  background: #fef0f0;
  border-radius: 6px;
  border-left: 4px solid #f56c6c;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 12px;
}

.validation-note {
  margin-top: 12px;
  font-size: 12px;
  color: #606266;
  line-height: 1.8;
}

.validation-note p {
  margin: 4px 0;
}

.validation-note .warning-text {
  color: #f56c6c;
  font-weight: 500;
}

.suggestion-item {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 8px;
}

.suggestion-item:last-child {
  margin-bottom: 0;
}

.raw-fields {
  margin-top: 16px;
}

:deep(.el-progress) {
  margin-top: 8px;
}

:deep(.el-divider) {
  margin: 16px 0;
}
</style>
