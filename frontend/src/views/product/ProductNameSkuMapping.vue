<template>
  <div class="mapping-container">
    <!-- 页面标题和操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">中文名称↔SKU映射管理</h1>
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>商品资料</el-breadcrumb-item>
          <el-breadcrumb-item>映射管理</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
      <div class="header-right">
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增映射</el-button>
        <el-button :icon="Refresh" @click="loadData" :loading="loading">刷新</el-button>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="店铺">
          <el-select v-model="filterForm.shop_id" placeholder="全部店铺" clearable filterable style="width: 180px">
            <el-option v-for="shop in shopList" :key="shop.id" :label="shop.shop_name" :value="shop.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filterForm.search" placeholder="中文名称/SKU" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
      <div class="filter-actions">
        <el-button type="success" @click="handleImport">
          <el-icon><Download /></el-icon>
          从商品资料导入
        </el-button>
      </div>
    </div>

    <!-- 映射表格 -->
    <div class="table-section">
      <el-card shadow="never">
        <template #header>
          <div class="table-header">
            <span class="table-title">映射列表</span>
            <div class="table-actions">
              <span class="total-text">共 {{ totalCount }} 条</span>
            </div>
          </div>
        </template>

        <el-table v-loading="tableLoading" :data="tableData" border stripe style="width: 100%">
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="shop_name" label="店铺" width="140">
            <template #default="{ row }">
              {{ row.shop_name || `店铺${row.shop_id}` }}
            </template>
          </el-table-column>
          <el-table-column prop="product_name_cn" label="中文名称" min-width="200" show-overflow-tooltip />
          <el-table-column prop="seller_sku" label="Seller SKU" min-width="160" show-overflow-tooltip />
          <el-table-column prop="source_type" label="来源" width="80" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.source_type === 'upload'" type="success" size="small">上传</el-tag>
              <el-tag v-else size="small">{{ row.source_type }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="updated_at" label="更新时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.updated_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button size="small" type="primary" link @click="handleEdit(row)">编辑</el-button>
              <el-button size="small" type="danger" link @click="handleDelete(row)">删除</el-button>
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

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="店铺" prop="shop_id">
          <el-select v-model="form.shop_id" placeholder="请选择店铺" style="width: 100%;">
            <el-option v-for="shop in shopList" :key="shop.id" :label="shop.shop_name" :value="shop.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="中文名称" prop="product_name_cn">
          <el-input v-model="form.product_name_cn" placeholder="请输入中文名称" />
        </el-form-item>
        <el-form-item label="Seller SKU" prop="seller_sku">
          <el-input v-model="form.seller_sku" placeholder="请输入Seller SKU" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Search, Download } from '@element-plus/icons-vue'
import { apiService } from '@/utils/api.js'

const loading = ref(false)
const tableLoading = ref(false)
const submitLoading = ref(false)

const filterForm = reactive({
  shop_id: '',
  search: ''
})

const currentPage = ref(1)
const pageSize = ref(20)
const totalCount = ref(0)

const tableData = ref([])
const shopList = ref([])

const dialogVisible = ref(false)
const dialogTitle = ref('新增映射')
const isEdit = ref(false)
const formRef = ref(null)
const form = reactive({
  id: null,
  shop_id: null,
  product_name_cn: '',
  seller_sku: ''
})
const formRules = {
  shop_id: [{ required: true, message: '请选择店铺', trigger: 'change' }],
  product_name_cn: [{ required: true, message: '请输入中文名称', trigger: 'blur' }],
  seller_sku: [{ required: true, message: '请输入Seller SKU', trigger: 'blur' }]
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

const loadShops = async () => {
  try {
    shopList.value = await apiService.shops.getAllShops()
  } catch (error) {
    console.error('加载店铺列表失败:', error)
  }
}

const loadData = async () => {
  tableLoading.value = true
  try {
    const result = await apiService.productNameSkuMapping.getList({
      page: currentPage.value,
      pageSize: pageSize.value,
      shop_id: filterForm.shop_id || undefined,
      search: filterForm.search
    })
    tableData.value = result.list || []
    totalCount.value = result.pagination?.total || 0
  } catch (error) {
    ElMessage.error('加载映射列表失败')
  } finally {
    tableLoading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  loadData()
}

const handleReset = () => {
  filterForm.shop_id = ''
  filterForm.search = ''
  currentPage.value = 1
  loadData()
}

const handleSizeChange = (newSize) => {
  pageSize.value = newSize
  loadData()
}

const handleCurrentChange = (newPage) => {
  currentPage.value = newPage
  loadData()
}

const handleAdd = () => {
  isEdit.value = false
  dialogTitle.value = '新增映射'
  form.id = null
  form.shop_id = null
  form.product_name_cn = ''
  form.seller_sku = ''
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  dialogTitle.value = '编辑映射'
  form.id = row.id
  form.shop_id = row.shop_id
  form.product_name_cn = row.product_name_cn
  form.seller_sku = row.seller_sku
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitLoading.value = true
    try {
      await apiService.productNameSkuMapping.upsert({
        id: form.id,
        shop_id: form.shop_id,
        product_name_cn: form.product_name_cn,
        seller_sku: form.seller_sku
      })
      ElMessage.success(isEdit.value ? '更新成功' : '新增成功')
      dialogVisible.value = false
      loadData()
    } catch (error) {
      ElMessage.error(error.message || '保存失败')
    } finally {
      submitLoading.value = false
    }
  })
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除映射"${row.product_name_cn}" ↔ "${row.seller_sku}"吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await apiService.productNameSkuMapping.delete(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

const handleImport = async () => {
  if (!filterForm.shop_id) {
    ElMessage.warning('请先选择店铺')
    return
  }
  try {
    await ElMessageBox.confirm('将从商品资料表导入已有完整映射的数据到映射表。是否继续？', '导入确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })
    const result = await apiService.productNameSkuMapping.importFromProducts({ shop_id: filterForm.shop_id })
    ElMessage.success(result.message || '导入完成')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '导入失败')
    }
  }
}

onMounted(() => {
  loadShops()
  loadData()
})
</script>

<style scoped>
.mapping-container {
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

.filter-section {
  margin-bottom: 20px;
}

.filter-actions {
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  margin-top: 8px;
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

.total-text {
  font-size: 13px;
  color: #909399;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
