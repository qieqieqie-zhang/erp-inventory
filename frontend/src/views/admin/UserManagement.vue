<template>
  <div class="user-management-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>用户管理</h2>
      <div class="header-actions">
        <el-button type="primary" :icon="Plus" @click="showAddDialog">
          新增用户
        </el-button>
        <el-button :icon="Refresh" @click="refreshData">
          刷新
        </el-button>
        <el-button type="success" :icon="Download" @click="exportData">
          导出用户
        </el-button>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <el-card class="filter-card">
      <div class="filter-content">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索用户名/邮箱/角色"
          class="search-input"
          :prefix-icon="Search"
          clearable
        />
        <el-select v-model="filterRole" placeholder="筛选角色" class="role-select">
          <el-option label="全部角色" value="" />
          <el-option label="系统管理员" value="admin" />
          <el-option label="公司老板" value="boss" />
          <el-option label="采购经理" value="purchase" />
          <el-option label="仓库管理员" value="warehouse" />
          <el-option label="财务专员" value="finance" />
          <el-option label="销售代表" value="sales" />
          <el-option label="只读查看员" value="viewer" />
        </el-select>
        <el-select v-model="filterStatus" placeholder="状态筛选" class="status-select">
          <el-option label="全部状态" value="" />
          <el-option label="正常" value="active" />
          <el-option label="禁用" value="disabled" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="handleSearch">
          搜索
        </el-button>
        <el-button @click="resetFilters">
          重置
        </el-button>
      </div>
    </el-card>

    <!-- 用户列表表格 -->
    <el-card class="user-table-card">
      <el-table :data="filteredUsers" v-loading="loading" border stripe>
        <el-table-column type="index" label="序号" width="80" align="center" />
        <el-table-column prop="username" label="用户名" width="140" />
        <el-table-column prop="email" label="邮箱" width="200" />
        <el-table-column prop="role" label="角色" width="140">
          <template #default="{ row }">
            <el-tag :type="getRoleTag(row.role)">
              {{ getRoleText(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="department" label="部门" width="140">
          <template #default="{ row }">
            {{ row.department || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="last_login" label="最后登录" width="180">
          <template #default="{ row }">
            <span v-if="row.last_login" class="last-login">
              {{ formatDate(row.last_login) }}
            </span>
            <span v-else class="no-login">从未登录</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-switch
              v-model="row.status"
              :active-value="'active'"
              :inactive-value="'disabled'"
              active-text="正常"
              inactive-text="禁用"
              @change="handleStatusChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" :icon="Edit" @click="editUser(row)">
                编辑
              </el-button>
              <el-button type="warning" size="small" :icon="Key" @click="resetPassword(row)">
                改密
              </el-button>
              <el-popconfirm
                title="确定要删除此用户吗？"
                @confirm="deleteUser(row.id)"
              >
                <template #reference>
                  <el-button type="danger" size="small" :icon="Delete">
                    删除
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
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

    <!-- 新增/编辑用户对话框 -->
    <el-dialog 
      v-model="userDialogVisible" 
      :title="isEditMode ? '编辑用户' : '新增用户'" 
      width="600"
    >
      <el-form
        ref="userFormRef"
        :model="userForm"
        :rules="userFormRules"
        label-width="100px"
        label-position="left"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="userForm.username"
            placeholder="请输入用户名"
            :disabled="isEditMode"
          />
        </el-form-item>
        <el-form-item v-if="!isEditMode" label="密码" prop="password">
          <el-input
            v-model="userForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        <el-form-item v-if="!isEditMode" label="确认密码" prop="confirmPassword">
          <el-input
            v-model="userForm.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="userForm.email"
            placeholder="请输入邮箱"
          />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" placeholder="请选择角色">
            <el-option label="系统管理员" value="admin" />
            <el-option label="公司老板" value="boss" />
            <el-option label="采购经理" value="purchase" />
            <el-option label="仓库管理员" value="warehouse" />
            <el-option label="财务专员" value="finance" />
            <el-option label="销售代表" value="sales" />
            <el-option label="只读查看员" value="viewer" />
          </el-select>
        </el-form-item>
        <el-form-item label="部门" prop="department">
          <el-input
            v-model="userForm.department"
            placeholder="请输入部门"
          />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input
            v-model="userForm.phone"
            placeholder="请输入手机号"
          />
        </el-form-item>
        <el-form-item label="备注" prop="remarks">
          <el-input
            v-model="userForm.remarks"
            type="textarea"
            :rows="3"
            placeholder="请输入备注"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-switch
            v-model="userForm.status"
            :active-value="'active'"
            :inactive-value="'disabled'"
            active-text="正常"
            inactive-text="禁用"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="userDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitUserForm">确认</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog
      v-model="passwordDialogVisible"
      title="重置密码"
      width="400"
    >
      <div class="password-dialog">
        <el-alert
          title="将为用户重置密码，新密码将通过邮件发送给用户"
          type="info"
          :closable="false"
          show-icon
          class="alert-message"
        />
        <el-form
          ref="passwordFormRef"
          :model="passwordForm"
          :rules="passwordFormRules"
          label-width="100px"
          class="password-form"
        >
          <el-form-item label="新密码" prop="newPassword">
            <el-input
              v-model="passwordForm.newPassword"
              type="password"
              placeholder="请输入新密码"
              show-password
            />
          </el-form-item>
          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input
              v-model="passwordForm.confirmPassword"
              type="password"
              placeholder="请再次输入新密码"
              show-password
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="passwordDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitPasswordReset">确认重置</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Refresh,
  Download,
  Search,
  Edit,
  Key,
  Delete
} from '@element-plus/icons-vue'

// 数据状态
const loading = ref(false)
const searchKeyword = ref('')
const filterRole = ref('')
const filterStatus = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const totalCount = ref(0)

// 对话框状态
const userDialogVisible = ref(false)
const passwordDialogVisible = ref(false)
const isEditMode = ref(false)

// 表单引用
const userFormRef = ref()
const passwordFormRef = ref()

// 用户表单
const userForm = ref({
  username: '',
  password: '',
  confirmPassword: '',
  email: '',
  role: 'viewer',
  department: '',
  phone: '',
  remarks: '',
  status: 'active'
})

// 密码重置表单
const passwordForm = ref({
  newPassword: '',
  confirmPassword: ''
})

// 表单验证规则
const userFormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度3-20个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        if (value !== userForm.value.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ]
}

const passwordFormRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        if (value !== passwordForm.value.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 模拟用户数据
const users = ref([
  {
    id: 1,
    username: 'admin',
    email: 'admin@company.com',
    role: 'admin',
    department: 'IT部门',
    created_at: '2024-01-01',
    last_login: '2024-03-15 10:30',
    status: 'active',
    phone: '13800138000',
    remarks: '系统管理员'
  },
  {
    id: 2,
    username: 'boss',
    email: 'boss@company.com',
    role: 'boss',
    department: '管理层',
    created_at: '2024-01-01',
    last_login: '2024-03-14 15:45',
    status: 'active',
    phone: '13800138001',
    remarks: '公司负责人'
  },
  {
    id: 3,
    username: 'purchase',
    email: 'purchase@company.com',
    role: 'purchase',
    department: '采购部',
    created_at: '2024-01-02',
    last_login: '2024 03-15 09:20',
    status: 'active',
    phone: '13800138002',
    remarks: '采购经理'
  },
  {
    id: 4,
    username: 'warehouse',
    email: 'warehouse@company.com',
    role: 'warehouse',
    department: '仓储部',
    created_at: '2024-01-02',
    last_login: '2024-03-14 16:30',
    status: 'active',
    phone: '13800138003',
    remarks: '仓库管理员'
  },
  {
    id: 5,
    username: 'finance',
    email: 'finance@company.com',
    role: 'finance',
    department: '财务部',
    created_at: '2024-01-03',
    last_login: '2024-03-13 14:15',
    status: 'active',
    phone: '13800138004',
    remarks: '财务专员'
  },
  {
    id: 6,
    username: 'sales',
    email: 'sales@company.com',
    role: 'sales',
    department: '销售部',
    created_at: '2024-01-03',
    last_login: '2024-03-15 11:45',
    status: 'active',
    phone: '13800138005',
    remarks: '销售代表'
  },
  {
    id: 7,
    username: 'viewer',
    email: 'viewer@company.com',
    role: 'viewer',
    department: '数据分析部',
    created_at: '2024-01-04',
    last_login: null,
    status: 'active',
    phone: '13800138006',
    remarks: '只读查看员'
  }
])

// 计算过滤后的用户
const filteredUsers = computed(() => {
  let filtered = users.value
  
  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(
      item => 
        item.username?.toLowerCase().includes(keyword) ||
        item.email?.toLowerCase().includes(keyword) ||
        item.role?.includes(keyword) ||
        item.department?.toLowerCase().includes(keyword)
    )
  }
  
  // 角色筛选
  if (filterRole.value) {
    filtered = filtered.filter(item => item.role === filterRole.value)
  }
  
  // 状态筛选
  if (filterStatus.value) {
    filtered = filtered.filter(item => item.status === filterStatus.value)
  }
  
  // 分页
  const startIndex = (currentPage.value - 1) * pageSize.value
  return filtered.slice(startIndex, startIndex + pageSize.value)
})

// 辅助函数
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const getRoleTag = (role) => {
  const map = {
    'admin': 'danger',
    'boss': 'warning',
    'purchase': 'primary',
    'warehouse': 'success',
    'finance': 'info',
    'sales': '',
    'viewer': 'info'
  }
  return map[role] || ''
}

const getRoleText = (role) => {
  const map = {
    'admin': '系统管理员',
    'boss': '公司老板',
    'purchase': '采购经理',
    'warehouse': '仓库管理员',
    'finance': '财务专员',
    'sales': '销售代表',
    'viewer': '只读查看员'
  }
  return map[role] || role
}

// 搜索和筛选处理
const handleSearch = () => {
  currentPage.value = 1
  refreshData()
}

const resetFilters = () => {
  searchKeyword.value = ''
  filterRole.value = ''
  filterStatus.value = ''
  currentPage.value = 1
  refreshData()
}

// 用户状态变更
const handleStatusChange = async (user) => {
  try {
    // TODO: 调用API更新用户状态
    await new Promise(resolve => setTimeout(resolve, 300))
    ElMessage.success(`用户 ${user.username} 状态已更新`)
  } catch (error) {
    console.error('更新状态失败:', error)
    ElMessage.error('更新状态失败')
  }
}

// 显示新增用户对话框
const showAddDialog = () => {
  isEditMode.value = false
  resetUserForm()
  userDialogVisible.value = true
}

// 编辑用户
const editUser = (user) => {
  isEditMode.value = true
  userForm.value = { ...user }
  userForm.value.password = ''
  userForm.value.confirmPassword = ''
  userDialogVisible.value = true
}

// 重置表单
const resetUserForm = () => {
  userForm.value = {
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    role: 'viewer',
    department: '',
    phone: '',
    remarks: '',
    status: 'active'
  }
  
  if (userFormRef.value) {
    userFormRef.value.resetFields()
  }
}

// 提交用户表单
const submitUserForm = async () => {
  try {
    await userFormRef.value.validate()
    
    loading.value = true
    // TODO: 调用API创建/更新用户
    await new Promise(resolve => setTimeout(resolve, 500))
    
    if (isEditMode.value) {
      // 更新逻辑
      const index = users.value.findIndex(u => u.id === userForm.value.id)
      if (index !== -1) {
        users.value[index] = { ...userForm.value }
      }
      ElMessage.success('用户更新成功')
    } else {
      // 新增逻辑
      const newUser = {
        id: users.value.length + 1,
        ...userForm.value,
        created_at: new Date().toISOString().split('T')[0],
        last_login: null
      }
      users.value.push(newUser)
      ElMessage.success('用户添加成功')
    }
    
    userDialogVisible.value = false
    refreshData()
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    loading.value = false
  }
}

// 重置密码
const resetPassword = (user) => {
  passwordForm.value.userId = user.id
  passwordForm.value.username = user.username
  passwordForm.value.newPassword = ''
  passwordForm.value.confirmPassword = ''
  
  if (passwordFormRef.value) {
    passwordFormRef.value.resetFields()
  }
  
  passwordDialogVisible.value = true
}

const submitPasswordReset = async () => {
  try {
    await passwordFormRef.value.validate()
    
    loading.value = true
    // TODO: 调用API重置密码
    await new Promise(resolve => setTimeout(resolve, 500))
    
    ElMessage.success(`用户 ${passwordForm.value.username} 密码重置成功`)
    passwordDialogVisible.value = false
  } catch (error) {
    console.error('密码重置失败:', error)
  } finally {
    loading.value = false
  }
}

// 删除用户
const deleteUser = async (userId) => {
  try {
    loading.value = true
    // TODO: 调用API删除用户
    await new Promise(resolve => setTimeout(resolve, 300))
    
    users.value = users.value.filter(user => user.id !== userId)
    ElMessage.success('用户删除成功')
    refreshData()
  } catch (error) {
    console.error('删除用户失败:', error)
    ElMessage.error('删除用户失败')
  } finally {
    loading.value = false
  }
}

// 导出数据
const exportData = () => {
  ElMessage.info('导出用户数据功能开发中...')
}

// 刷新数据
const refreshData = async () => {
  loading.value = true
  try {
    // TODO: 调用API获取用户数据
    await new Promise(resolve => setTimeout(resolve, 300))
    totalCount.value = users.value.length
  } catch (error) {
    console.error('获取用户数据失败:', error)
    ElMessage.error('获取用户数据失败')
  } finally {
    loading.value = false
  }
}

// 分页处理
const handleSizeChange = (newSize) => {
  pageSize.value = newSize
  currentPage.value = 1
  refreshData()
}

const handleCurrentChange = (newPage) => {
  currentPage.value = newPage
  refreshData()
}

// 组件初始化
onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.user-management-container {
  padding: 20px;
  background-color: #f5f7fa;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-content {
  display: flex;
  gap: 15px;
  align-items: center;
}

.search-input {
  width: 250px;
}

.role-select, .status-select {
  width: 150px;
}

.user-table-card {
  margin-top: 20px;
}

.last-login {
  color: #67C23A;
}

.no-login {
  color: #909399;
  font-style: italic;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.password-dialog {
  padding: 10px;
}

.alert-message {
  margin-bottom: 20px;
}

.password-form {
  margin-top: 20px;
}

.el-button {
  margin-right: 10px;
}

.el-button:last-child {
  margin-right: 0;
}

.el-form-item {
  margin-bottom: 20px;
}

:deep(.el-switch__label) {
  color: #606266;
}

:deep(.el-switch__label.is-active) {
  color: #409EFF;
}
</style>