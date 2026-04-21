<template>
  <div class="logistics-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>物流跟踪</h2>
      <div class="header-actions">
        <el-button type="primary" :icon="Plus" @click="showAddDialog">
          新增物流
        </el-button>
        <el-button type="success" :icon="Upload" @click="showUploadDialog">
          上传物流数据
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
          <el-form-item label="店铺">
            <el-select v-model="filterForm.shopId" placeholder="选择店铺" clearable>
              <el-option label="全部店铺" value="" />
              <el-option
                v-for="shop in shopList"
                :key="shop.id"
                :label="shop.shop_name"
                :value="shop.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="物流状态">
            <el-select v-model="filterForm.status" placeholder="全部状态" clearable>
              <el-option
                v-for="status in statusList"
                :key="status.value"
                :label="status.label"
                :value="status.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="目的国家">
            <el-input v-model="filterForm.country" placeholder="输入国家" clearable />
          </el-form-item>
          <el-form-item label="关键词">
            <el-input
              v-model="filterForm.search"
              placeholder="FBA入仓号/SKU/物流单号"
              clearable
              @keyup.enter="handleSearch"
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
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="resetFilter">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <!-- 物流状态统计 -->
    <div class="stats-container">
      <el-row :gutter="20">
        <el-col :span="4">
          <el-card shadow="never" class="stat-card">
            <div class="stat-item">
              <div class="stat-icon" style="background-color: #909399;">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.pending_count || 0 }}</div>
                <div class="stat-label">待发货</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="4">
          <el-card shadow="never" class="stat-card">
            <div class="stat-item">
              <div class="stat-icon" style="background-color: #409EFF;">
                <el-icon><Van /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.shipped_count || 0 }}</div>
                <div class="stat-label">已发货</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="4">
          <el-card shadow="never" class="stat-card">
            <div class="stat-item">
              <div class="stat-icon" style="background-color: #E6A23C;">
                <el-icon><Ship /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.in_transit_count || 0 }}</div>
                <div class="stat-label">运输中</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="4">
          <el-card shadow="never" class="stat-card">
            <div class="stat-item">
              <div class="stat-icon" style="background-color: #F56C6C;">
                <el-icon><Place /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.arrived_count || 0 }}</div>
                <div class="stat-label">已到港</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="4">
          <el-card shadow="never" class="stat-card">
            <div class="stat-item">
              <div class="stat-icon" style="background-color: #67C23A;">
                <el-icon><CircleCheck /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.customs_cleared_count || 0 }}</div>
                <div class="stat-label">清关完成</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="4">
          <el-card shadow="never" class="stat-card">
            <div class="stat-item">
              <div class="stat-icon" style="background-color: #36cfc9;">
                <el-icon><Box /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.delivered_count || 0 }}</div>
                <div class="stat-label">已派送</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 数据表格 -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <el-button type="danger" :disabled="selectedLogistics.length === 0" @click="handleBatchDelete">批量删除{{ selectedLogistics.length > 0 ? `(${selectedLogistics.length})` : '' }}</el-button>
        </div>
      </template>
      <el-table
        ref="logisticsTableRef"
        :data="logisticsList"
        v-loading="loading"
        style="width: 100%"
        stripe
        border
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="id" label="编号" width="80" />
        <el-table-column prop="fba_warehouse_number" label="FBA仓库编号" width="150" />
        <el-table-column prop="tracking_number" label="运输编号" width="150" show-overflow-tooltip />
        <el-table-column prop="destination_country" label="目的地" width="100" />
        <el-table-column prop="cargo_type" label="货物类型" width="100" />
        <el-table-column prop="shipping_method" label="运输方式" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.shipping_method === 'sea'" type="primary">海运</el-tag>
            <el-tag v-else-if="row.shipping_method === 'air'" type="warning">空运</el-tag>
            <el-tag v-else-if="row.shipping_method === 'express'" type="success">快递</el-tag>
            <span v-else>{{ row.shipping_method }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="ship_date" label="发货日期" width="120">
          <template #default="{ row }">
            {{ row.ship_date ? formatDate(row.ship_date) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="ship_quantity" label="发货数量" width="100" align="center" />
        <el-table-column prop="unit_price" label="单价" width="100" align="right">
          <template #default="{ row }">
            ${{ formatNumber(row.unit_price) }}
          </template>
        </el-table-column>
        <el-table-column prop="total_price" label="总价" width="120" align="right">
          <template #default="{ row }">
            ${{ formatNumber(row.total_price) }}
          </template>
        </el-table-column>
        <el-table-column prop="carrier" label="承运人" width="120" show-overflow-tooltip />
        <el-table-column prop="logistics_status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.logistics_status)">
              {{ getStatusText(row.logistics_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remarks" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">查看</el-button>
            <el-button type="success" link @click="handleUpdateStatus(row)">更新状态</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 更新状态对话框 -->
    <el-dialog v-model="statusDialogVisible" title="更新物流状态" width="400px">
      <el-form :model="statusForm" label-width="100px">
        <el-form-item label="当前状态">
          <el-tag :type="getStatusType(currentRow?.logistics_status)">
            {{ getStatusText(currentRow?.logistics_status) }}
          </el-tag>
        </el-form-item>
        <el-form-item label="新状态" prop="status">
          <el-select v-model="statusForm.status" placeholder="选择新状态" style="width: 100%">
            <el-option
              v-for="status in statusList"
              :key="status.value"
              :label="status.label"
              :value="status.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleStatusSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 新增对话框 -->
    <el-dialog v-model="addDialogVisible" title="新增物流" width="800px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="FBA仓库编号" prop="fba_warehouse_number">
              <el-input v-model="formData.fba_warehouse_number" placeholder="请输入FBA仓库编号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="运输编号" prop="tracking_number">
              <el-input v-model="formData.tracking_number" placeholder="请输入运输编号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="店铺" prop="shop_id">
              <el-select v-model="formData.shop_id" placeholder="选择店铺" style="width: 100%">
                <el-option
                  v-for="shop in shopList"
                  :key="shop.id"
                  :label="shop.shop_name"
                  :value="shop.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="目的地" prop="destination_country">
              <el-input v-model="formData.destination_country" placeholder="请输入目的地" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="SKU编号" prop="sku_code">
              <el-input v-model="formData.sku_code" placeholder="请输入SKU编号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="SKU名称" prop="sku_name">
              <el-input v-model="formData.sku_name" placeholder="请输入SKU名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="货物类型" prop="cargo_type">
              <el-input v-model="formData.cargo_type" placeholder="请输入货物类型" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="运输方式" prop="shipping_method">
              <el-select v-model="formData.shipping_method" placeholder="选择运输方式" style="width: 100%">
                <el-option label="海运" value="sea" />
                <el-option label="空运" value="air" />
                <el-option label="快递" value="express" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="发货日期" prop="ship_date">
              <el-date-picker
                v-model="formData.ship_date"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="发货数量" prop="ship_quantity">
              <el-input-number v-model="formData.ship_quantity" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="单价" prop="unit_price">
              <el-input-number v-model="formData.unit_price" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="总价" prop="total_price">
              <el-input-number v-model="formData.total_price" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="承运人" prop="carrier">
              <el-input v-model="formData.carrier" placeholder="请输入承运人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="货运代理" prop="forwarder_name">
              <el-input v-model="formData.forwarder_name" placeholder="请输入货运代理" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="箱数" prop="carton_count">
              <el-input-number v-model="formData.carton_count" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="箱均价格" prop="price_per_carton">
              <el-input-number v-model="formData.price_per_carton" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="运费" prop="freight_cost">
              <el-input-number v-model="formData.freight_cost" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="VAT税费" prop="vat_amount">
              <el-input-number v-model="formData.vat_amount" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="退税" prop="tax_rebate">
              <el-input-number v-model="formData.tax_rebate" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="物流状态" prop="logistics_status">
              <el-select v-model="formData.logistics_status" placeholder="选择状态" style="width: 100%">
                <el-option
                  v-for="status in statusList"
                  :key="status.value"
                  :label="status.label"
                  :value="status.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注" prop="remarks">
          <el-input v-model="formData.remarks" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 上传对话框 -->
    <el-dialog v-model="uploadDialogVisible" title="上传物流数据" width="900px">
      <el-form :model="uploadForm" label-width="100px">
        <el-form-item label="店铺" required>
          <el-select v-model="uploadForm.shopId" placeholder="选择店铺" style="width: 100%">
            <el-option
              v-for="shop in shopList"
              :key="shop.id"
              :label="shop.shop_name"
              :value="shop.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="物流方式" required>
          <el-select v-model="uploadForm.logisticsCompany" placeholder="选择物流方式" style="width: 100%">
            <el-option
              v-for="company in companies"
              :key="company.name"
              :label="company.description"
              :value="company.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="选择文件">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            accept=".xlsx,.xls,.csv"
            :on-change="handleFileChange"
          >
            <el-button>选择Excel/CSV文件</el-button>
            <span style="margin-left: 10px; color: #909399;">支持 .xlsx, .xls, .csv 格式</span>
          </el-upload>
        </el-form-item>
        <el-form-item v-if="uploadForm.file">
          <el-button type="primary" @click="handlePreview" :loading="previewLoading">
            预览数据
          </el-button>
          <el-button @click="handleClearFile">清除文件</el-button>
        </el-form-item>
      </el-form>

      <!-- 数据预览区域 -->
      <div v-if="previewData.length > 0" class="preview-section">
        <div class="preview-header">
          <span>数据预览 (共 {{ previewData.length }} 条)</span>
          <el-tag type="success">数据格式正确</el-tag>
        </div>
        <el-table :data="previewData" border size="small" max-height="300" style="width: 100%">
          <el-table-column v-for="col in previewColumns" :key="col" :prop="col" :label="col" min-width="120" show-overflow-tooltip />
        </el-table>
      </div>

      <template #footer>
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpload" :disabled="previewData.length === 0">
          确认上传
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Upload, Refresh, Download, Clock, Van, Ship, Place, CircleCheck, Box
} from '@element-plus/icons-vue'
import { apiService } from '../../utils/api'

const loading = ref(false)
const logisticsList = ref([])
const shopList = ref([])
const selectedLogistics = ref([])
const logisticsTableRef = ref(null)
const statusList = ref([
  { value: 'pending', label: '待发货' },
  { value: 'shipped', label: '已发货' },
  { value: 'in_transit', label: '运输中' },
  { value: 'arrived', label: '已到港' },
  { value: 'customs_cleared', label: '清关完成' },
  { value: 'delivered', label: '已派送' }
])
const stats = ref({})
const dateRange = ref([])

const filterForm = reactive({
  shopId: '',
  status: '',
  country: '',
  search: '',
  startDate: '',
  endDate: ''
})

const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

const statusDialogVisible = ref(false)
const addDialogVisible = ref(false)
const uploadDialogVisible = ref(false)
const currentRow = ref(null)

const formRef = ref(null)
const uploadRef = ref(null)
const router = useRouter()

const formData = reactive({
  shop_id: null,
  fba_warehouse_number: '',
  sku_code: '',
  sku_name: '',
  tracking_number: '',
  destination_country: '',
  cargo_type: '',
  shipping_method: '',
  ship_date: '',
  ship_quantity: 0,
  unit_price: 0,
  total_price: 0,
  carrier: '',
  forwarder_name: '',
  carton_count: 0,
  price_per_carton: 0,
  vat_amount: 0,
  tax_rebate: 0,
  freight_cost: 0,
  logistics_status: 'pending',
  remarks: ''
})

const statusForm = reactive({
  status: ''
})

const uploadForm = reactive({
  shopId: null,
  file: null,
  logisticsCompany: 'desu'
})

const previewData = ref([])
const companies = ref([])
const previewColumns = ref([])
const previewLoading = ref(false)

const formRules = {
  fba_warehouse_number: [{ required: true, message: '请输入FBA仓库编号', trigger: 'blur' }],
  tracking_number: [{ required: true, message: '请输入运输编号', trigger: 'blur' }]
}

onMounted(() => {
  fetchData()
  fetchShops()
  fetchCompanies()
  fetchStats()
})

const fetchData = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      search: filterForm.search,
      status: filterForm.status,
      country: filterForm.country,
      shopId: filterForm.shopId,
      startDate: filterForm.startDate,
      endDate: filterForm.endDate
    }
    const data = await apiService.logistics.getList(params)
    logisticsList.value = data.list
    pagination.total = data.pagination.total
  } catch (error) {
    console.error('获取物流列表失败:', error)
    ElMessage.error('获取物流列表失败')
  } finally {
    loading.value = false
  }
}

const fetchShops = async () => {
  try {
    shopList.value = await apiService.shops.getAllShops()
  } catch (error) {
    console.error('获取店铺列表失败:', error)
  }
}

const fetchCompanies = async () => {
  try {
    const response = await fetch('/api/logistics/companies')
    const result = await response.json()
    if (result.code === 200) {
      companies.value = result.data
    }
  } catch (error) {
    console.error('获取物流公司列表失败:', error)
  }
}

const fetchStats = async () => {
  try {
    stats.value = await apiService.logistics.getStats({ shopId: filterForm.shopId })
  } catch (error) {
    console.error('获取统计失败:', error)
  }
}

const handleSearch = () => {
  pagination.currentPage = 1
  fetchData()
  fetchStats()
}

const resetFilter = () => {
  filterForm.shopId = ''
  filterForm.status = ''
  filterForm.country = ''
  filterForm.search = ''
  filterForm.startDate = ''
  filterForm.endDate = ''
  dateRange.value = []
  handleSearch()
}

const handleDateChange = (val) => {
  if (val && val.length === 2) {
    filterForm.startDate = val[0]
    filterForm.endDate = val[1]
  } else {
    filterForm.startDate = ''
    filterForm.endDate = ''
  }
}

const handleSizeChange = (val) => {
  pagination.pageSize = val
  pagination.currentPage = 1
  fetchData()
}

const handleCurrentChange = () => {
  fetchData()
}

const refreshData = () => {
  fetchData()
  fetchStats()
}

const showAddDialog = () => {
  Object.keys(formData).forEach(key => {
    if (key === 'shop_id') formData[key] = null
    else if (['ship_quantity', 'carton_count'].includes(key)) formData[key] = 0
    else if (['unit_price', 'total_price', 'price_per_carton', 'vat_amount', 'tax_rebate', 'freight_cost'].includes(key)) formData[key] = 0
    else if (key === 'logistics_status') formData[key] = 'pending'
    else formData[key] = ''
  })
  addDialogVisible.value = true
}

const handleView = (row) => {
  router.push(`/logistics/${row.id}`)
}

const handleUpdateStatus = (row) => {
  currentRow.value = row
  statusForm.status = row.logistics_status
  statusDialogVisible.value = true
}

const handleStatusSubmit = async () => {
  try {
    await apiService.logistics.updateStatus(currentRow.value.id, { status: statusForm.status })
    ElMessage.success('状态更新成功')
    statusDialogVisible.value = false
    fetchData()
    fetchStats()
  } catch (error) {
    ElMessage.error('更新失败')
  }
}

const handleSelectionChange = (selection) => {
  selectedLogistics.value = selection
}

const handleBatchDelete = () => {
  if (selectedLogistics.value.length === 0) return
  ElMessageBox.confirm(`确定要删除选中的 ${selectedLogistics.value.length} 条物流记录吗？`, '批量删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      for (const row of selectedLogistics.value) {
        await apiService.logistics.delete(row.id)
      }
      ElMessage.success('批量删除成功')
      selectedLogistics.value = []
      logisticsTableRef.value?.clearSelection()
      fetchData()
    } catch (error) {
      ElMessage.error('批量删除失败')
    }
  }).catch(() => {})
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除这条物流记录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await apiService.logistics.delete(row.id)
      ElMessage.success('删除成功')
      fetchData()
      fetchStats()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()

    await apiService.logistics.create(formData)
    ElMessage.success('创建成功')
    addDialogVisible.value = false
    fetchData()
    fetchStats()
  } catch (error) {
    if (error !== false) {
      ElMessage.error('操作失败')
    }
  }
}

const showUploadDialog = () => {
  uploadForm.shopId = null
  uploadForm.file = null
  uploadForm.logisticsCompany = 'desu'
  uploadDialogVisible.value = true
}

const handleFileChange = (file) => {
  uploadForm.file = file.raw
  previewData.value = []
  previewColumns.value = []
}

const handleClearFile = () => {
  uploadForm.file = null
  previewData.value = []
  previewColumns.value = []
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}

const handlePreview = async () => {
  if (!uploadForm.file) {
    ElMessage.warning('请先选择文件')
    return
  }

  previewLoading.value = true
  const formData = new FormData()
  formData.append('file', uploadForm.file)
  formData.append('shopId', uploadForm.shopId || '')
  formData.append('preview', 'true')

  try {
    const response = await fetch('http://localhost:3000/api/logistics/preview', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    })
    const result = await response.json()

    if (result.code === 200) {
      previewData.value = result.data.list || []
      previewColumns.value = result.data.columns || []
      ElMessage.success('预览成功')
    } else {
      ElMessage.error(result.message || '预览失败')
    }
  } catch (error) {
    console.error('预览失败:', error)
    ElMessage.error('预览失败: ' + error.message)
  } finally {
    previewLoading.value = false
  }
}

const handleUpload = async () => {
  if (!uploadForm.shopId) {
    ElMessage.warning('请选择店铺')
    return
  }
  if (!uploadForm.file) {
    ElMessage.warning('请选择文件')
    return
  }

  const formDataUpload = new FormData()
  formDataUpload.append('file', uploadForm.file)
  formDataUpload.append('shopId', uploadForm.shopId)
  formDataUpload.append('logisticsCompany', uploadForm.logisticsCompany)

  try {
    await apiService.logistics.upload(formDataUpload)
    ElMessage.success('上传成功')
    uploadDialogVisible.value = false
    previewData.value = []
    previewColumns.value = []
    fetchData()
    fetchStats()
  } catch (error) {
    ElMessage.error('上传失败: ' + (error.message || '未知错误'))
  }
}

const exportData = async () => {
  try {
    const params = {
      format: 'json',
      shopId: filterForm.shopId,
      status: filterForm.status,
      startDate: filterForm.startDate,
      endDate: filterForm.endDate
    }
    await apiService.logistics.exportData(params)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

const getStatusType = (status) => {
  const map = {
    pending: 'info',
    shipped: 'primary',
    in_transit: 'warning',
    arrived: 'warning',
    customs_cleared: 'success',
    delivered: 'success'
  }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const item = statusList.value.find(s => s.value === status)
  return item ? item.label : status
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

const formatDateTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const formatNumber = (num) => {
  if (num == null) return '0'
  return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.logistics-container {
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
  font-size: 20px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-container {
  padding: 10px 0;
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
  padding: 12px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 20px;
  color: #fff;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.table-card {
  border-radius: 8px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.preview-section {
  margin-top: 20px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 15px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-weight: 500;
}
</style>