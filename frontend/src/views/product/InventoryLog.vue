<template>
  <div class="inventory-log-container">
    <!-- 页面标题和操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">国内库存 - 出入库记录</h1>
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>商品资料</el-breadcrumb-item>
          <el-breadcrumb-item>出入库记录</el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <div class="header-right">
        <el-button type="primary" :icon="Plus" @click="showChangeDialog = true">
          库存变动
        </el-button>
        <el-button :icon="Refresh" @click="loadData" :loading="loading">
          刷新
        </el-button>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <el-form :model="filterForm" inline>
        <el-form-item label="商品名称">
          <el-input
            v-model="filterForm.search"
            placeholder="输入商品中文名称"
            :prefix-icon="Search"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="变动类型">
          <el-select v-model="filterForm.change_type" placeholder="全部" clearable style="width: 120px">
            <el-option
              v-for="type in changeTypeList"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="业务类型">
          <el-select v-model="filterForm.biz_type" placeholder="全部" clearable style="width: 150px">
            <el-option
              v-for="type in bizTypeList"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            />
          </el-select>
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
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 统计数据 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <el-icon class="stat-icon" color="#409eff"><Box /></el-icon>
              <div class="stat-info">
                <div class="stat-label">商品种类数</div>
                <div class="stat-value">{{ stats.total_skus || 0 }}</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <el-icon class="stat-icon" color="#67c23a"><DocumentChecked /></el-icon>
              <div class="stat-info">
                <div class="stat-label">总在库数量</div>
                <div class="stat-value">{{ stats.total_on_hand || 0 }}</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <el-icon class="stat-icon" color="#e6a23c"><Warning /></el-icon>
              <div class="stat-info">
                <div class="stat-label">低库存预警</div>
                <div class="stat-value">{{ stats.low_stock_count || 0 }}</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <el-icon class="stat-icon" color="#f56c6c"><CircleClose /></el-icon>
              <div class="stat-info">
                <div class="stat-label">缺货商品</div>
                <div class="stat-value">{{ stats.out_of_stock_count || 0 }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 日志表格 -->
    <div class="table-section">
      <el-card shadow="never">
        <template #header>
          <div class="table-header">
            <span class="table-title">库存变动记录</span>
          </div>
        </template>

        <el-table
          v-loading="tableLoading"
          :data="logList"
          style="width: 100%"
          :default-sort="{ prop: 'created_at', order: 'descending' }"
        >
          <el-table-column prop="product_name_cn" label="中文名称" min-width="160" show-overflow-tooltip />

          <el-table-column prop="change_type" label="变动类型" width="100">
            <template #default="{ row }">
              <el-tag :type="getChangeTypeTag(row.change_type)" size="small">
                {{ getChangeTypeLabel(row.change_type) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="biz_type" label="业务类型" width="120">
            <template #default="{ row }">
              {{ getBizTypeLabel(row.biz_type) }}
            </template>
          </el-table-column>

          <el-table-column prop="quantity" label="变动数量" width="100">
            <template #default="{ row }">
              <span :class="row.change_type === 'in' ? 'text-success' : 'text-danger'">
                {{ row.change_type === 'in' ? '+' : '-' }}{{ row.quantity }}
              </span>
            </template>
          </el-table-column>

          <el-table-column prop="before_qty" label="变动前" width="80" />
          <el-table-column prop="after_qty" label="变动后" width="80" />

          <el-table-column prop="operator" label="操作人" width="100" />

          <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />

          <el-table-column prop="related_doc_id" label="关联单号" width="120" show-overflow-tooltip />

          <el-table-column prop="created_at" label="变动时间" width="160" sortable>
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
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

    <!-- 库存变动对话框 -->
    <el-dialog
      v-model="showChangeDialog"
      title="库存变动"
      width="500px"
    >
      <el-form
        ref="changeFormRef"
        :model="changeForm"
        :rules="changeRules"
        label-width="100px"
      >
        <el-form-item label="中文名称" prop="product_name_cn">
          <el-select
            v-model="changeForm.product_name_cn"
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入中文名称"
            style="width: 100%"
            @change="handleProductNameChange"
          >
            <el-option
              v-for="name in productNameList"
              :key="name"
              :label="name"
              :value="name"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="当前库存" v-if="currentStock">
          <span class="stock-info">
            在库: {{ currentStock.on_hand_qty }} | 可用: {{ currentStock.available_qty }}
          </span>
        </el-form-item>

        <el-form-item label="变动类型" prop="change_type">
          <el-radio-group v-model="changeForm.change_type">
            <el-radio value="in">入库</el-radio>
            <el-radio value="out">出库</el-radio>
            <el-radio value="adjust">调整</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="业务类型" prop="biz_type">
          <el-select v-model="changeForm.biz_type" placeholder="请选择业务类型" style="width: 100%">
            <el-option
              v-for="type in availableBizTypes"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="数量" prop="quantity">
          <el-input-number
            v-model="changeForm.quantity"
            :min="1"
            :max="999999"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="changeForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注说明"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showChangeDialog = false">取消</el-button>
          <el-button type="primary" @click="submitChange" :loading="submitLoading">
            确认
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 库存详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      :title="`库存详情 - ${detailProductName}`"
      width="600px"
    >
      <el-descriptions :column="2" border v-if="detailData">
        <el-descriptions-item label="中文名称">{{ detailData.product_name_cn }}</el-descriptions-item>
        <el-descriptions-item label="在库库存">{{ detailData.on_hand_qty }}</el-descriptions-item>
        <el-descriptions-item label="可用库存">{{ detailData.available_qty }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ formatDateTime(detailData.updated_at) }}</el-descriptions-item>
      </el-descriptions>

      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Plus, Refresh, Search, Box, Warning, CircleClose, DocumentChecked
} from '@element-plus/icons-vue'
import { apiService } from '@/utils/api.js'

// 数据状态
const loading = ref(false)
const tableLoading = ref(false)
const submitLoading = ref(false)

// 筛选表单
const filterForm = ref({
  search: '',
  change_type: '',
  biz_type: '',
  start_date: '',
  end_date: ''
})

const dateRange = ref([])

// 分页
const currentPage = ref(1)
const pageSize = ref(20)
const totalCount = ref(0)

// 数据
const logList = ref([])
const stats = ref({})
const productNameList = ref([])
const changeTypeList = ref([])
const bizTypeList = ref([])

// 对话框
const showChangeDialog = ref(false)
const showDetailDialog = ref(false)
const changeFormRef = ref()
const detailProductName = ref('')
const detailData = ref(null)
const currentStock = ref(null)

// 变动表单
const changeForm = ref({
  product_name_cn: '',
  change_type: 'in',
  biz_type: '',
  quantity: 1,
  remark: ''
})

// 表单验证
const changeRules = {
  product_name_cn: [{ required: true, message: '请选择或输入中文名称', trigger: 'change' }],
  change_type: [{ required: true, message: '请选择变动类型', trigger: 'change' }],
  biz_type: [{ required: true, message: '请选择业务类型', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }]
}

// 根据变动类型获取可用业务类型
const availableBizTypes = computed(() => {
  if (changeForm.value.change_type === 'in') {
    return bizTypeList.value.filter(t => ['purchase', 'return', 'transfer'].includes(t.value))
  } else if (changeForm.value.change_type === 'out') {
    return bizTypeList.value.filter(t => ['order', 'damage', 'return_supplier'].includes(t.value))
  }
  return bizTypeList.value
})

// 方法
const getChangeTypeLabel = (type) => {
  const map = { in: '入库', out: '出库', adjust: '调整' }
  return map[type] || type
}

const getChangeTypeTag = (type) => {
  const map = { in: 'success', out: 'danger', adjust: 'warning' }
  return map[type] || 'info'
}

const getBizTypeLabel = (type) => {
  const item = bizTypeList.value.find(t => t.value === type)
  return item ? item.label : type
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

const handleDateChange = (val) => {
  if (val && val.length === 2) {
    filterForm.value.start_date = val[0]
    filterForm.value.end_date = val[1]
  } else {
    filterForm.value.start_date = ''
    filterForm.value.end_date = ''
  }
}

const loadData = async () => {
  tableLoading.value = true
  try {
    const [logsRes, statsRes, bizTypesRes, changeTypesRes] = await Promise.all([
      apiService.domesticInventory.getLogs({
        page: currentPage.value,
        pageSize: pageSize.value,
        search: filterForm.value.search,
        change_type: filterForm.value.change_type,
        biz_type: filterForm.value.biz_type,
        start_date: filterForm.value.start_date,
        end_date: filterForm.value.end_date
      }),
      apiService.domesticInventory.getStats(),
      apiService.domesticInventory.getBizTypes(),
      apiService.domesticInventory.getChangeTypes()
    ])

    logList.value = logsRes.list || []
    totalCount.value = logsRes.pagination?.total || 0
    stats.value = statsRes || {}
    bizTypeList.value = bizTypesRes || []
    changeTypeList.value = changeTypesRes || []
  } catch (error) {
    ElMessage.error('加载数据失败: ' + (error.message || '未知错误'))
  } finally {
    tableLoading.value = false
    loading.value = false
  }
}

const loadProductNameList = async () => {
  try {
    // 从商品资料获取已维护中文名称的商品列表
    const list = await apiService.products.getSkuList()
    // 过滤掉没有中文名称的商品
    productNameList.value = (list || [])
      .filter(item => item.product_name_cn)
      .map(item => item.product_name_cn)
  } catch (error) {
    console.error('获取商品名称列表失败:', error)
  }
}

const handleSearch = () => {
  currentPage.value = 1
  loadData()
}

const resetFilter = () => {
  filterForm.value = {
    search: '',
    change_type: '',
    biz_type: '',
    start_date: '',
    end_date: ''
  }
  dateRange.value = []
  currentPage.value = 1
  loadData()
}

const handleSizeChange = (newSize) => {
  pageSize.value = newSize
  currentPage.value = 1
  loadData()
}

const handleCurrentChange = (newPage) => {
  currentPage.value = newPage
  loadData()
}

const handleProductNameChange = async (name) => {
  if (!name) {
    currentStock.value = null
    return
  }
  try {
    const detail = await apiService.domesticInventory.getDetail(name)
    currentStock.value = detail || null
  } catch (error) {
    currentStock.value = null
  }
}

const submitChange = async () => {
  if (!changeFormRef.value) return

  try {
    await changeFormRef.value.validate()

    submitLoading.value = true
    await apiService.domesticInventory.changeStock({
      product_name_cn: changeForm.value.product_name_cn,
      change_type: changeForm.value.change_type,
      biz_type: changeForm.value.biz_type,
      quantity: changeForm.value.quantity,
      remark: changeForm.value.remark
    })

    ElMessage.success('库存变动成功')
    showChangeDialog.value = false
    changeFormRef.value?.clearValidate()
    changeForm.value = {
      product_name_cn: '',
      change_type: 'in',
      biz_type: '',
      quantity: 1,
      remark: ''
    }
    currentStock.value = null
    loadData()
  } catch (error) {
    ElMessage.error('操作失败: ' + (error.message || '未知错误'))
  } finally {
    submitLoading.value = false
  }
}

const viewInventoryDetail = async (name) => {
  detailProductName.value = name
  try {
    detailData.value = await apiService.domesticInventory.getDetail(name)
    showDetailDialog.value = true
  } catch (error) {
    ElMessage.error('获取详情失败: ' + error.message)
  }
}

// 生命周期
onMounted(() => {
  loadData()
  loadProductNameList()
})
</script>

<style scoped>
.inventory-log-container {
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

.stats-section {
  margin-bottom: 20px;
}

.stat-card {
  border: none;
  border-radius: 8px;
}

.stat-card .el-card__body {
  padding: 20px;
}

.stat-content {
  display: flex;
  align-items: center;
}

.stat-icon {
  font-size: 40px;
  margin-right: 16px;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
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

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding: 20px 0;
}

.text-success {
  color: #67c23a;
  font-weight: bold;
}

.text-danger {
  color: #f56c6c;
  font-weight: bold;
}

.stock-info {
  color: #909399;
  font-size: 13px;
}
</style>
