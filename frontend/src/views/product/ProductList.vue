<template>
  <div class="product-list-container">
    <!-- 页面标题和操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">商品资料</h1>
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>商品资料</el-breadcrumb-item>
          <el-breadcrumb-item>商品资料列表</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
      
      <div class="header-right">
        <el-button 
          type="primary" 
          :icon="Plus" 
          @click="$router.push('/products/upload')"
        >
          上传商品
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

    <!-- 筛选区域 -->
    <div class="filter-section">
      <el-form :model="filterForm" inline>
        <el-form-item label="SKU搜索">
          <el-input
            v-model="filterForm.search"
            placeholder="输入SKU或商品名称"
            :prefix-icon="Search"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable>
            <el-option label="在售" value="active" />
            <el-option label="缺货" value="out_of_stock" />
            <el-option label="停售" value="inactive" />
          </el-select>
        </el-form-item>

        <el-form-item label="一级分类">
          <el-select v-model="filterForm.category_id" placeholder="全部分类" clearable filterable style="width: 150px">
            <el-option
              v-for="cat in categoryList"
              :key="cat.id"
              :label="cat.category_name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="库存范围">
          <el-input-number
            v-model="filterForm.minQuantity"
            placeholder="最小"
            :min="0"
            controls-position="right"
            style="width: 100px;"
          />
          <span style="margin: 0 8px;">-</span>
          <el-input-number
            v-model="filterForm.maxQuantity"
            placeholder="最大"
            :min="0"
            controls-position="right"
            style="width: 100px;"
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
                <div class="stat-label">总商品数</div>
                <div class="stat-value">{{ stats.total_products || 0 }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <el-icon class="stat-icon" color="#67c23a"><ShoppingCart /></el-icon>
              <div class="stat-info">
                <div class="stat-label">在售商品</div>
                <div class="stat-value">{{ stats.active_products || 0 }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <el-icon class="stat-icon" color="#e6a23c"><Warning /></el-icon>
              <div class="stat-info">
                <div class="stat-label">低库存商品</div>
                <div class="stat-value">{{ stats.low_stock_products || 0 }}</div>
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
                <div class="stat-value">{{ stats.out_of_stock_products || 0 }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 商品表格 -->
    <div class="table-section">
      <el-card shadow="never">
        <template #header>
          <div class="table-header">
            <span class="table-title">商品列表</span>
            <div class="table-actions">
              <el-button 
                size="small" 
                :icon="Delete" 
                @click="handleBatchDelete"
                :disabled="selectedProducts.length === 0"
                plain
              >
                批量删除
              </el-button>
            </div>
          </div>
        </template>
        
        <el-table
          v-loading="tableLoading"
          :data="productList"
          style="width: 100%"
          @selection-change="handleSelectionChange"
          :default-sort="{ prop: 'seller_sku', order: 'ascending' }"
        >
          <el-table-column type="selection" width="55" />

          <el-table-column prop="product_name_cn" label="中文名称" min-width="160" show-overflow-tooltip sortable>
            <template #default="{ row }">
              <span>{{ row.product_name_cn || '-' }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="category_name" label="一级分类" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.category_name" type="warning" size="small">
                {{ row.category_name }}
              </el-tag>
              <span v-else class="text-muted">未分类</span>
            </template>
          </el-table-column>

          <el-table-column prop="seller_sku" label="seller_sku" width="160" sortable>
            <template #default="{ row }">
              <el-link type="primary" @click="handleViewDetail(row.seller_sku)">
                {{ row.seller_sku }}
              </el-link>
            </template>
          </el-table-column>

          <el-table-column prop="domestic_inventory_qty" label="国内库存" width="100">
            <template #default="{ row }">
              <el-tag
                :type="row.domestic_inventory_qty === 0 ? 'danger' : row.domestic_inventory_qty < 10 ? 'warning' : 'success'"
                size="small"
              >
                {{ row.domestic_inventory_qty || 0 }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button 
                size="small" 
                :icon="Edit" 
                @click="handleEdit(row)"
              >
                编辑
              </el-button>
              <el-button 
                size="small" 
                :icon="Delete" 
                type="danger" 
                @click="handleDelete(row)"
                plain
              >
                删除
              </el-button>
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

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="showEditDialog"
      :title="editForm.seller_sku ? `编辑商品: ${editForm.seller_sku}` : '编辑商品'"
      width="600px"
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-width="100px"
      >
        <el-form-item label="SKU" prop="seller_sku">
          <el-input v-model="editForm.seller_sku" disabled />
        </el-form-item>
        
        <el-form-item label="商品名称" prop="item_name">
          <el-input v-model="editForm.item_name" />
        </el-form-item>
        
        <el-form-item label="售价" prop="price">
          <el-input-number
            v-model="editForm.price"
            :min="0"
            :precision="2"
            controls-position="right"
            style="width: 100%;"
          />
        </el-form-item>
        
        <el-form-item label="可售库存" prop="quantity">
          <el-input-number
            v-model="editForm.quantity"
            :min="0"
            controls-position="right"
            style="width: 100%;"
          />
        </el-form-item>
        
        <el-form-item label="待处理库存" prop="pending_quantity">
          <el-input-number
            v-model="editForm.pending_quantity"
            :min="0"
            controls-position="right"
            style="width: 100%;"
          />
        </el-form-item>
        
        <el-form-item label="ASIN" prop="asin1">
          <el-input v-model="editForm.asin1" />
        </el-form-item>
        
        <el-form-item label="配送渠道" prop="fulfillment_channel">
          <el-select v-model="editForm.fulfillment_channel">
            <el-option label="亚马逊北美" value="AMAZON_NA" />
            <el-option label="亚马逊欧洲" value="AMAZON_EU" />
            <el-option label="亚马逊日本" value="AMAZON_JP" />
            <el-option label="卖家自配送" value="MERCHANT" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="状态" prop="status">
          <el-select v-model="editForm.status">
            <el-option label="在售" value="active" />
            <el-option label="缺货" value="out_of_stock" />
            <el-option label="停售" value="inactive" />
          </el-select>
        </el-form-item>

        <el-form-item label="所属店铺" prop="shop_id">
          <el-select v-model="editForm.shop_id" placeholder="请选择店铺" clearable style="width: 100%">
            <el-option
              v-for="shop in shopList"
              :key="shop.id"
              :label="shop.shop_name"
              :value="shop.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showEditDialog = false">取消</el-button>
          <el-button type="primary" @click="saveEdit" :loading="editLoading">
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Download, Refresh, Search, Edit, Delete,
  Box, ShoppingCart, Warning, CircleClose
} from '@element-plus/icons-vue'
import { apiService } from '@/utils/api.js'
import { useShopStore } from '@/stores/shop.js'

const router = useRouter()
const shopStore = useShopStore()

// 数据状态
const loading = ref(false)
const tableLoading = ref(false)
const exportLoading = ref(false)
const editLoading = ref(false)

// 筛选表单
const filterForm = ref({
  search: '',
  status: '',
  category_id: '',
  minQuantity: null,
  maxQuantity: null
})

// 分页
const currentPage = ref(1)
const pageSize = ref(20)
const totalCount = ref(0)

// 数据
const productList = ref([])
const stats = ref({})
const selectedProducts = ref([])
const categoryList = ref([]) // 分类列表

// 对话框
const showEditDialog = ref(false)
const editForm = ref({})
const editFormRef = ref()

// 编辑表单验证规则
const editRules = {
  item_name: [
    { required: true, message: '请输入商品名称', trigger: 'blur' }
  ],
  quantity: [
    { required: true, message: '请输入可售库存', trigger: 'blur' }
  ]
}

// 格式化函数
const formatCurrency = (value) => {
  if (!value) return '0.00'
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const formatChannel = (channel) => {
  const channelMap = {
    'AMAZON_NA': '亚马逊北美',
    'AMAZON_EU': '亚马逊欧洲',
    'AMAZON_JP': '亚马逊日本',
    'MERCHANT': '卖家自配送'
  }
  return channelMap[channel] || channel
}

const formatStatus = (status) => {
  const statusMap = {
    'active': '在售',
    'out_of_stock': '缺货',
    'inactive': '停售'
  }
  return statusMap[status] || status
}

const getStockTagType = (quantity) => {
  if (quantity === 0) return 'danger'
  if (quantity < 10) return 'warning'
  return 'success'
}

const getStatusTagType = (status) => {
  const typeMap = {
    'active': 'success',
    'out_of_stock': 'danger',
    'inactive': 'info'
  }
  return typeMap[status] || 'info'
}

// 加载数据
const loadData = async () => {
  tableLoading.value = true
  try {
    const shopCode = shopStore.getShopCode()
    const [productsRes, statsRes] = await Promise.all([
      apiService.products.getList({
        page: currentPage.value,
        pageSize: pageSize.value,
        search: filterForm.value.search,
        status: filterForm.value.status,
        category_id: filterForm.value.category_id,
        minQuantity: filterForm.value.minQuantity,
        maxQuantity: filterForm.value.maxQuantity,
        shop_code: shopCode
      }),
      apiService.products.getStats({ shop_code: shopCode })
    ])

    productList.value = productsRes.list || []
    totalCount.value = productsRes.pagination?.total || 0
    stats.value = statsRes || {}
  } catch (error) {
    ElMessage.error('加载数据失败: ' + (error.message || '未知错误'))
  } finally {
    tableLoading.value = false
    loading.value = false
  }
}

// 事件处理
const handleSearch = () => {
  currentPage.value = 1
  loadData()
}

const resetFilter = () => {
  filterForm.value = {
    search: '',
    status: '',
    category_id: '',
    minQuantity: null,
    maxQuantity: null
  }
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

const handleSelectionChange = (selection) => {
  selectedProducts.value = selection
}

const handleViewDetail = (sku) => {
  router.push(`/products/detail/${sku}`)
}

const handleEdit = (product) => {
  editForm.value = { ...product }
  showEditDialog.value = true
}

const handleDelete = async (product) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除商品 "${product.seller_sku}" 吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await apiService.products.delete(product.seller_sku)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

const handleBatchDelete = async () => {
  if (selectedProducts.value.length === 0) {
    ElMessage.warning('请先选择商品')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedProducts.value.length} 个商品吗？此操作不可恢复。`,
      '批量删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 批量删除
    const deletePromises = selectedProducts.value.map(product =>
      apiService.products.delete(product.seller_sku).catch(err => ({
        sku: product.seller_sku,
        error: err.message
      }))
    )
    
    const results = await Promise.allSettled(deletePromises)
    const errors = results.filter(r => r.status === 'rejected')
    
    if (errors.length === 0) {
      ElMessage.success('批量删除成功')
      selectedProducts.value = []
      loadData()
    } else {
      ElMessage.warning(`删除完成，但有 ${errors.length} 个商品删除失败`)
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败: ' + error.message)
    }
  }
}

const saveEdit = async () => {
  if (!editFormRef.value) return
  
  try {
    await editFormRef.value.validate()
    
    editLoading.value = true
    await apiService.products.update(editForm.value.seller_sku, editForm.value)
    
    ElMessage.success('保存成功')
    showEditDialog.value = false
    loadData()
  } catch (error) {
    if (error.errors) {
      ElMessage.warning('请检查表单填写是否正确')
    } else {
      ElMessage.error('保存失败: ' + error.message)
    }
  } finally {
    editLoading.value = false
  }
}

const handleExport = async () => {
  exportLoading.value = true
  try {
    const blob = await apiService.products.exportData('csv')
    
    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `products_${new Date().toISOString().slice(0, 10)}.csv`
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

const refreshData = () => {
  loadData()
}

// 获取分类列表
const loadCategories = async () => {
  try {
    const list = await apiService.category.getAllEnabled()
    categoryList.value = list || []
  } catch (error) {
    console.error('获取分类列表失败:', error)
  }
}

// 生命周期
onMounted(() => {
  loadCategories()
  loadData()
})
</script>

<style scoped>
.product-list-container {
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

/* 统计数据 */
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

/* 商品名称样式 */
.product-name {
  display: flex;
  flex-direction: column;
}

.name-text {
  font-weight: 500;
  margin-bottom: 4px;
  line-height: 1.4;
}

.asin-text {
  font-size: 12px;
  color: #909399;
}

/* 文本淡化 */
.text-muted {
  color: #909399;
}

/* 库存分布标签 */
.inv-tag {
  display: inline-block;
  padding: 2px 6px;
  margin: 1px;
  background-color: #f0f2f5;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .header-right {
    width: 100%;
    justify-content: flex-start;
  }
  
  .filter-section .el-form-item {
    width: 100%;
    margin-bottom: 10px;
  }
  
  .stats-section .el-col {
    width: 100%;
    margin-bottom: 16px;
  }
}
</style>