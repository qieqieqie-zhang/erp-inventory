<template>
  <div class="shop-list-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>店铺管理</h2>
      <div class="header-actions">
        <el-button type="primary" :icon="Plus" @click="showAddDialog">新增店铺</el-button>
        <el-button :icon="Refresh" @click="refreshData">刷新</el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-icon total">
                <el-icon><Shop /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.total_shops || 0 }}</div>
                <div class="stat-label">店铺总数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-icon active">
                <el-icon><CircleCheck /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.active_shops || 0 }}</div>
                <div class="stat-label">活跃店铺</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-icon inactive">
                <el-icon><CircleClose /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.inactive_shops || 0 }}</div>
                <div class="stat-label">停用店铺</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-icon amazon">
                <el-icon><Goods /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.amazon_shops || 0 }}</div>
                <div class="stat-label">亚马逊店铺</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 搜索和筛选 -->
    <div class="search-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索店铺名称、代码或区域"
        :prefix-icon="Search"
        clearable
        style="width: 300px"
        @keyup.enter="handleSearch"
      />
      <el-select v-model="filterStatus" placeholder="店铺状态" clearable style="width: 150px" @change="handleSearch">
        <el-option label="全部" value="" />
        <el-option label="活跃" value="active" />
        <el-option label="停用" value="inactive" />
      </el-select>
      <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
    </div>

    <!-- 店铺列表 -->
    <div style="margin-bottom: 10px; display: flex; justify-content: flex-end;">
      <el-button type="danger" :disabled="selectedShops.length === 0" @click="handleBatchDelete">批量删除{{ selectedShops.length > 0 ? `(${selectedShops.length})` : '' }}</el-button>
    </div>
    <el-table ref="shopTableRef" :data="shopList" v-loading="loading" stripe border @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" />
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="shop_id" label="店铺标识ID" width="180" />
      <el-table-column prop="shop_code" label="店铺代码" width="120" />
      <el-table-column prop="shop_name" label="店铺名称" min-width="180">
        <template #default="{ row }">
          <div class="shop-name">
            <el-icon><Shop /></el-icon>
            <span>{{ row.shop_name }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="shop_type" label="店铺类型" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.shop_type === 'Amazon'" type="success">Amazon</el-tag>
          <el-tag v-else-if="row.shop_type === 'eBay'" type="warning">eBay</el-tag>
          <el-tag v-else-if="row.shop_type === 'Walmart'" type="danger">Walmart</el-tag>
          <el-tag v-else>{{ row.shop_type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="region" label="区域/国家" width="120" />
      <el-table-column prop="marketplace" label="市场" width="150" />
      <el-table-column prop="seller_id" label="卖家ID" width="150" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
            {{ row.status === 'active' ? '活跃' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link :icon="Edit" @click="handleEdit(row)">编辑</el-button>
          <el-button type="danger" link :icon="Delete" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="totalCount"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑店铺' : '新增店铺'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="shopForm" :rules="formRules" label-width="100px">
        <el-form-item label="店铺标识ID" prop="shop_id">
          <el-input v-model="shopForm.shop_id" placeholder="留空则自动生成，可包含字母、数字、下划线和短横线" />
          <div class="form-tip">用于唯一标识店铺，创建后仍可修改</div>
        </el-form-item>
        <el-form-item label="店铺名称" prop="shop_name">
          <el-input v-model="shopForm.shop_name" placeholder="请输入店铺名称" />
        </el-form-item>
        <el-form-item label="店铺代码" prop="shop_code">
          <el-input v-model="shopForm.shop_code" placeholder="请输入店铺代码" />
        </el-form-item>
        <el-form-item label="店铺类型" prop="shop_type">
          <el-select v-model="shopForm.shop_type" placeholder="请选择店铺类型" style="width: 100%">
            <el-option label="Amazon" value="Amazon" />
            <el-option label="eBay" value="eBay" />
            <el-option label="Walmart" value="Walmart" />
            <el-option label="其他" value="Other" />
          </el-select>
        </el-form-item>
        <el-form-item label="区域/国家" prop="region">
          <el-input v-model="shopForm.region" placeholder="如：美国、英国、德国" />
        </el-form-item>
        <el-form-item label="市场" prop="marketplace">
          <el-input v-model="shopForm.marketplace" placeholder="如：北美站、欧洲站、日本站" />
        </el-form-item>
        <el-form-item label="卖家ID" prop="seller_id">
          <el-input v-model="shopForm.seller_id" placeholder="请输入卖家ID" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="shopForm.status">
            <el-radio value="active">活跃</el-radio>
            <el-radio value="inactive">停用</el-radio>
          </el-radio-group>
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
import {
  Plus, Refresh, Search, Edit, Delete, Shop,
  CircleCheck, CircleClose, Goods
} from '@element-plus/icons-vue'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
const getToken = () => localStorage.getItem('token')

// 状态
const loading = ref(false)
const shopList = ref([])
const stats = ref({})
const selectedShops = ref([])
const shopTableRef = ref(null)
const searchKeyword = ref('')
const filterStatus = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const totalCount = ref(0)

// 对话框
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref(null)
const currentShopId = ref(null)

// 表单
const shopForm = reactive({
  shop_id: '',
  shop_name: '',
  shop_code: '',
  shop_type: 'Amazon',
  region: '',
  marketplace: '',
  seller_id: '',
  status: 'active'
})

const formRules = {
  shop_id: [
    { required: false, message: '请输入店铺标识ID', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_-]{3,50}$/, message: '店铺标识ID只能包含字母、数字、下划线和短横线，长度3-50位', trigger: 'blur' }
  ],
  shop_name: [{ required: true, message: '请输入店铺名称', trigger: 'blur' }],
  shop_code: [{ required: false, message: '请输入店铺代码', trigger: 'blur' }],
  shop_type: [{ required: true, message: '请选择店铺类型', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

// 获取数据
const fetchData = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: currentPage.value,
      pageSize: pageSize.value,
      search: searchKeyword.value,
      status: filterStatus.value
    })

    const response = await fetch(`${API_BASE_URL}/shops?${params}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    const result = await response.json()

    if (result.code === 200) {
      shopList.value = result.data.list
      totalCount.value = result.data.pagination.total
    }
  } catch (error) {
    ElMessage.error('获取店铺列表失败')
  } finally {
    loading.value = false
  }
}

// 获取统计
const fetchStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/shops/stats`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    const result = await response.json()

    if (result.code === 200) {
      stats.value = result.data
    }
  } catch (error) {
    console.error('获取统计失败:', error)
  }
}

// 刷新
const refreshData = () => {
  fetchData()
  fetchStats()
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  fetchData()
}

// 分页
const handleSizeChange = (val) => {
  pageSize.value = val
  fetchData()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchData()
}

// 显示新增对话框
const showAddDialog = () => {
  isEdit.value = false
  currentShopId.value = null
  Object.assign(shopForm, {
    shop_id: '',
    shop_name: '',
    shop_code: '',
    shop_type: 'Amazon',
    region: '',
    marketplace: '',
    seller_id: '',
    status: 'active'
  })
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row) => {
  isEdit.value = true
  currentShopId.value = row.id
  Object.assign(shopForm, {
    shop_id: row.shop_id || '',
    shop_name: row.shop_name,
    shop_code: row.shop_code || '',
    shop_type: row.shop_type,
    region: row.region,
    marketplace: row.marketplace,
    seller_id: row.seller_id,
    status: row.status
  })
  dialogVisible.value = true
}

// 提交
const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  try {
    const url = isEdit.value
      ? `${API_BASE_URL}/shops/${currentShopId.value}`
      : `${API_BASE_URL}/shops`
    const method = isEdit.value ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(shopForm)
    })
    const result = await response.json()

    if (result.code === 200) {
      ElMessage.success(isEdit.value ? '店铺更新成功' : '店铺创建成功')
      dialogVisible.value = false
      refreshData()
    } else {
      ElMessage.error(result.message || '操作失败')
    }
  } catch (error) {
    ElMessage.error('操作失败')
  } finally {
    submitLoading.value = false
  }
}

const handleSelectionChange = (selection) => {
  selectedShops.value = selection
}

const handleBatchDelete = async () => {
  if (selectedShops.value.length === 0) return
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedShops.value.length} 家店铺吗？`,
      '批量删除确认',
      { type: 'warning' }
    )
    for (const shop of selectedShops.value) {
      await fetch(`${API_BASE_URL}/shops/${shop.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
    }
    ElMessage.success('批量删除成功')
    selectedShops.value = []
    shopTableRef.value?.clearSelection()
    fetchShopList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败')
    }
  }
}

// 删除
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除店铺"${row.shop_name}"吗？`,
      '删除确认',
      { type: 'warning' }
    )

    const response = await fetch(`${API_BASE_URL}/shops/${row.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    const result = await response.json()

    if (result.code === 200) {
      ElMessage.success('删除成功')
      refreshData()
    } else {
      ElMessage.error(result.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

// 初始化
onMounted(() => {
  fetchData()
  fetchStats()
})
</script>

<style scoped>
.shop-list-container {
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
  font-size: 24px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.stats-cards {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 8px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.stat-icon.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.stat-icon.active {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
}

.stat-icon.inactive {
  background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
  color: white;
}

.stat-icon.amazon {
  background: linear-gradient(135deg, #f7971e 0%, #ffd200 100%);
  color: white;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.shop-name {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #409eff;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
