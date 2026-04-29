<template>
  <div class="category-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">分类设置</h1>
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>商品资料</el-breadcrumb-item>
          <el-breadcrumb-item>分类设置</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
      <div class="header-right">
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增分类</el-button>
      </div>
    </div>

    <!-- 说明 -->
    <div class="page-note">
      一级分类用于对商品资料进行分组管理。一个商品只能归属一个分类。分类可在商品列表中作为筛选条件使用。
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <el-form :model="filterForm" inline>
        <el-form-item label="分类搜索">
          <el-input
            v-model="filterForm.search"
            placeholder="输入分类名称"
            :prefix-icon="Search"
            clearable
            @keyup.enter="handleSearch"
            style="width: 200px;"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 分类表格 -->
    <div class="table-section">
      <el-card shadow="never">
        <el-table
          v-loading="tableLoading"
          :data="categoryList"
          style="width: 100%"
          border
        >
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="category_name" label="分类名称" min-width="200">
            <template #default="{ row }">
              <el-tag :type="row.is_enabled === 1 ? 'success' : 'info'" plain>
                {{ row.category_name }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="sort_order" label="排序" width="100" sortable align="center" />
          <el-table-column prop="is_enabled" label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.is_enabled === 1 ? 'success' : 'danger'" size="small">
                {{ row.is_enabled === 1 ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="product_count" label="商品数" width="100" align="center">
            <template #default="{ row }">
              <span class="product-count">{{ row.product_count || 0 }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
          <el-table-column prop="created_at" label="创建时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button size="small" :icon="Edit" @click="handleEdit(row)">编辑</el-button>
              <el-button
                size="small"
                :icon="row.is_enabled === 1 ? Close : Check"
                :type="row.is_enabled === 1 ? 'warning' : 'success'"
                @click="handleToggleStatus(row)"
                :loading="row.loading"
              >
                {{ row.is_enabled === 1 ? '停用' : '启用' }}
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

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="showDialog"
      :title="dialogTitle"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="分类名称" prop="category_name">
          <el-input
            v-model="formData.category_name"
            placeholder="请输入分类名称"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="排序" prop="sort_order">
          <el-input-number
            v-model="formData.sort_order"
            :min="0"
            :max="9999"
            controls-position="right"
            style="width: 100%;"
          />
          <div class="form-tip">数字越小排序越靠前</div>
        </el-form-item>
        <el-form-item label="状态" prop="is_enabled">
          <el-switch
            v-model="formData.is_enabled"
            :active-value="1"
            :inactive-value="0"
            active-text="启用"
            inactive-text="停用"
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="formData.remark"
            type="textarea"
            placeholder="请输入备注说明"
            :rows="3"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showDialog = false">取消</el-button>
          <el-button type="primary" @click="saveForm" :loading="saveLoading">
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Edit, Delete, Search, Refresh,
  Close, Check
} from '@element-plus/icons-vue'
import { apiService } from '@/utils/api.js'

// 数据状态
const tableLoading = ref(false)
const saveLoading = ref(false)

// 筛选表单
const filterForm = ref({
  search: ''
})

// 分页
const currentPage = ref(1)
const pageSize = ref(20)
const totalCount = ref(0)

// 列表数据
const categoryList = ref([])

// 对话框
const showDialog = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const formRef = ref()
const formData = ref({
  category_name: '',
  sort_order: 0,
  is_enabled: 1,
  remark: ''
})
const formRules = {
  category_name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' }
  ]
}

// 计算对话框标题
const dialogTitle = computed(() => isEdit.value ? '编辑分类' : '新增分类')

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 加载分类列表
const loadData = async () => {
  tableLoading.value = true
  try {
    const response = await apiService.category.getList({
      page: currentPage.value,
      pageSize: pageSize.value,
      search: filterForm.value.search,
      include_disabled: true
    })

    categoryList.value = (response.list || []).map(item => ({
      ...item,
      loading: false
    }))
    totalCount.value = response.pagination?.total || 0
  } catch (error) {
    ElMessage.error('加载数据失败: ' + (error.message || '未知错误'))
  } finally {
    tableLoading.value = false
  }
}

// 事件处理
const handleSearch = () => {
  currentPage.value = 1
  loadData()
}

const resetFilter = () => {
  filterForm.value.search = ''
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

// 新增
const handleAdd = () => {
  isEdit.value = false
  editId.value = null
  formData.value = {
    category_name: '',
    sort_order: 0,
    is_enabled: 1,
    remark: ''
  }
  showDialog.value = true
}

// 编辑
const handleEdit = (row) => {
  isEdit.value = true
  editId.value = row.id
  formData.value = {
    category_name: row.category_name,
    sort_order: row.sort_order || 0,
    is_enabled: row.is_enabled,
    remark: row.remark || ''
  }
  showDialog.value = true
}

// 保存
const saveForm = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    saveLoading.value = true

    if (isEdit.value) {
      await apiService.category.update(editId.value, formData.value)
      ElMessage.success('更新成功')
    } else {
      await apiService.category.create(formData.value)
      ElMessage.success('创建成功')
    }

    showDialog.value = false
    loadData()
  } catch (error) {
    if (error.errors) {
      ElMessage.warning('请检查表单填写是否正确')
    } else {
      ElMessage.error(error.message || '保存失败')
    }
  } finally {
    saveLoading.value = false
  }
}

// 切换状态
const handleToggleStatus = async (row) => {
  const action = row.is_enabled === 1 ? '停用' : '启用'
  const newStatus = row.is_enabled === 1 ? 0 : 1

  try {
    await ElMessageBox.confirm(
      `确定要${action}分类 "${row.category_name}" 吗？${row.is_enabled === 1 ? '停用后，该分类将不再出现在商品列表筛选中。' : '启用后，该分类将恢复正常使用。'}`,
      `${action}确认`,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    row.loading = true
    await apiService.category.update(row.id, { is_enabled: newStatus })
    ElMessage.success(`${action}成功`)
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || `${action}失败`)
    }
  } finally {
    row.loading = false
  }
}

// 生命周期
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.category-container {
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

.page-note {
  background: #fdf6ec;
  color: #e6a23c;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
  line-height: 1.6;
}

.filter-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.table-section {
  margin-bottom: 20px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding: 20px 0;
}

.product-count {
  font-weight: 500;
  color: #409eff;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
