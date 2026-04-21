<template>
  <div class="product-detail-container">
    <!-- 返回导航 -->
    <div class="back-navigation">
      <el-button 
        :icon="ArrowLeft" 
        type="text" 
        @click="$router.push('/products')"
      >
        返回商品列表
      </el-button>
    </div>

    <!-- 商品详情卡片 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="5" animated />
    </div>

    <div v-else-if="product" class="detail-content">
      <el-row :gutter="20">
        <!-- 左侧：商品基本信息 -->
        <el-col :span="16">
          <el-card shadow="hover" class="main-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">商品基本信息</span>
                <div class="card-actions">
                  <el-button 
                    type="primary" 
                    :icon="Edit" 
                    @click="handleEdit"
                  >
                    编辑
                  </el-button>
                  <el-button 
                    type="danger" 
                    :icon="Delete" 
                    @click="handleDelete"
                  >
                    删除
                  </el-button>
                </div>
              </div>
            </template>

            <el-descriptions 
              :column="2" 
              border
              size="large"
            >
              <!-- SKU和名称 -->
              <el-descriptions-item label="SKU" label-class-name="desc-label">
                <strong>{{ product.seller_sku }}</strong>
              </el-descriptions-item>
              
              <el-descriptions-item label="商品名称">
                {{ product.item_name || '未设置' }}
              </el-descriptions-item>

              <!-- 价格信息 -->
              <el-descriptions-item label="售价">
                <span class="price-text">{{ formatCurrency(product.price) }}</span>
              </el-descriptions-item>

              <el-descriptions-item label="ASIN">
                {{ product.asin1 || '未设置' }}
              </el-descriptions-item>

              <!-- 库存信息 -->
              <el-descriptions-item label="可售库存">
                <el-tag :type="getStockTagType(product.quantity)">
                  {{ product.quantity || 0 }}
                </el-tag>
              </el-descriptions-item>

              <el-descriptions-item label="待处理库存">
                <el-tag type="info">
                  {{ product.pending_quantity || 0 }}
                </el-tag>
              </el-descriptions-item>

              <!-- 渠道和状态 -->
              <el-descriptions-item label="配送渠道">
                <el-tag :type="product.fulfillment_channel === 'AMAZON_NA' ? 'success' : 'info'">
                  {{ formatChannel(product.fulfillment_channel) }}
                </el-tag>
              </el-descriptions-item>

              <el-descriptions-item label="商品状态">
                <el-tag :type="getStatusTagType(product.status)">
                  {{ formatStatus(product.status) }}
                </el-tag>
              </el-descriptions-item>

              <!-- 时间信息 -->
              <el-descriptions-item label="上架时间">
                {{ formatDate(product.open_date) }}
              </el-descriptions-item>

              <el-descriptions-item label="最后更新时间">
                {{ formatDate(product.updated_at) }}
              </el-descriptions-item>

              <!-- 上传统计 -->
              <el-descriptions-item label="上传批次">
                {{ product.upload_batch || '未记录' }}
              </el-descriptions-item>

              <el-descriptions-item label="创建时间">
                {{ formatDate(product.created_at) }}
              </el-descriptions-item>
            </el-descriptions>

            <!-- 库存时间线（如果需要） -->
            <div class="timeline-section" v-if="false">
              <h3>库存变化历史</h3>
              <el-timeline>
                <el-timeline-item timestamp="2024-03-10" placement="top">
                  <el-card>
                    <h4>库存调整</h4>
                    <p>从 100 件调整为 85 件</p>
                    <p>操作人：admin</p>
                  </el-card>
                </el-timeline-item>
              </el-timeline>
            </div>
          </el-card>
        </el-col>

        <!-- 右侧：商品图片和快捷操作 -->
        <el-col :span="8">
          <!-- 商品图片 -->
          <el-card shadow="hover" class="image-card">
            <template #header>
              <span class="card-title">商品图片</span>
            </template>
            
            <div class="image-wrapper">
              <img 
                v-if="product.image_url" 
                :src="product.image_url" 
                alt="商品图片"
                class="product-image"
              />
              <div v-else class="no-image">
                <el-icon size="80" color="#dcdfe6"><Picture /></el-icon>
                <p>暂无图片</p>
              </div>
              
              <div class="image-actions" v-if="product.image_url">
                <el-button type="text" :icon="View">查看大图</el-button>
                <el-button type="text" :icon="Download">下载</el-button>
              </div>
            </div>
          </el-card>

          <!-- 快捷操作 -->
          <el-card shadow="hover" class="actions-card">
            <template #header>
              <span class="card-title">快捷操作</span>
            </template>
            
            <div class="quick-actions">
              <el-button 
                type="success" 
                :icon="ShoppingCart"
                @click="handleAddToOrder"
                :disabled="product.quantity === 0"
              >
                创建订单
              </el-button>
              
              <el-button 
                :icon="Edit"
                @click="handleAdjustStock"
              >
                调整库存
              </el-button>
              
              <el-button 
                :icon="Refresh"
                @click="refreshData"
              >
                刷新数据
              </el-button>
              
              <el-button 
                :icon="Printer"
                @click="handlePrint"
              >
                打印标签
              </el-button>
            </div>
          </el-card>

          <!-- 相关统计 -->
          <el-card shadow="hover" class="stats-card">
            <template #header>
              <span class="card-title">销售统计</span>
            </template>

            <div class="stats-list">
              <div class="stat-item">
                <span class="stat-label">本月销量</span>
                <span class="stat-value">--</span>
              </div>

              <div class="stat-item">
                <span class="stat-label">累计销量</span>
                <span class="stat-value">--</span>
              </div>

              <div class="stat-item">
                <span class="stat-label">库存周转率</span>
                <span class="stat-value">--</span>
              </div>

              <div class="stat-item">
                <span class="stat-label">销售排名</span>
                <span class="stat-value">--</span>
              </div>
            </div>
          </el-card>

          <!-- 库存日志 -->
          <el-card shadow="hover" class="log-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">库存变动日志</span>
                <el-button type="text" :icon="Refresh" @click="loadSkuLogs">刷新</el-button>
              </div>
            </template>

            <div v-if="logLoading" class="log-loading">
              <el-icon class="is-loading"><Loading /></el-icon>
              加载中...
            </div>
            <div v-else-if="skuLogs.length === 0" class="log-empty">
              暂无日志记录
            </div>
            <div v-else class="log-list">
              <div v-for="log in skuLogs" :key="log.id" class="log-item">
                <div class="log-header">
                  <el-tag size="small" :type="getLogModuleType(log.module)">{{ getLogModuleName(log.module) }}</el-tag>
                  <el-tag size="small" :type="getLogActionType(log.action)">{{ getLogActionName(log.action) }}</el-tag>
                  <span class="log-time">{{ formatLogTime(log.created_at) }}</span>
                </div>
                <div class="log-body">
                  <span class="log-change">
                    <span v-if="log.change_amount > 0" class="change-add">+{{ log.change_amount }}</span>
                    <span v-else-if="log.change_amount < 0" class="change-minus">{{ log.change_amount }}</span>
                    <span v-else class="change-zero">0</span>
                  </span>
                  <span class="log-qty">({{ log.before_quantity }} → {{ log.after_quantity }})</span>
                  <span class="log-remarks">{{ log.remarks }}</span>
                </div>
                <div class="log-footer">
                  <span class="log-operator">{{ log.operator_name || '系统' }}</span>
                </div>
              </div>
              <div v-if="logTotal > logPageSize" class="log-more">
                <el-button type="text" @click="loadMoreLogs">加载更多</el-button>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 编辑对话框 -->
      <el-dialog
        v-model="showEditDialog"
        :title="`编辑商品: ${product.seller_sku}`"
        width="600px"
      >
        <ProductEditForm
          v-if="showEditDialog"
          :product="product"
          @cancel="showEditDialog = false"
          @save="handleSaveEdit"
        />
      </el-dialog>

      <!-- 调整库存对话框 -->
      <el-dialog
        v-model="showStockDialog"
        title="调整库存"
        width="400px"
      >
        <el-form
          ref="stockFormRef"
          :model="stockForm"
          label-width="100px"
        >
          <el-form-item label="调整类型" required>
            <el-radio-group v-model="stockForm.adjustmentType">
              <el-radio label="add">增加</el-radio>
              <el-radio label="subtract">减少</el-radio>
              <el-radio label="set">设置</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="调整数量" required>
            <el-input-number
              v-model="stockForm.quantity"
              :min="0"
              style="width: 100%"
            />
          </el-form-item>
          
          <el-form-item label="备注">
            <el-input
              v-model="stockForm.remark"
              type="textarea"
              placeholder="请输入调整原因"
              rows="3"
            />
          </el-form-item>
        </el-form>
        
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="showStockDialog = false">取消</el-button>
            <el-button type="primary" @click="confirmStockAdjustment">
              确定
            </el-button>
          </div>
        </template>
      </el-dialog>
    </div>

    <!-- 没有找到商品的提示 -->
    <div v-else class="not-found">
      <el-result
        icon="error"
        title="商品不存在"
        :sub-title="`找不到SKU为 ${sku} 的商品`"
      >
        <template #extra>
          <el-button type="primary" @click="$router.push('/products')">
            返回商品列表
          </el-button>
        </template>
      </el-result>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft, Edit, Delete, ShoppingCart,
  Refresh, Printer, View, Download,
  Picture, Loading
} from '@element-plus/icons-vue'
import { apiService } from '@/utils/api.js'

const route = useRoute()
const router = useRouter()

// 路由参数
const sku = computed(() => route.params.sku)

// 数据状态
const loading = ref(false)
const product = ref(null)

// 库存日志
const skuLogs = ref([])
const logLoading = ref(false)
const logPage = ref(1)
const logPageSize = ref(10)
const logTotal = ref(0)

// 对话框状态
const showEditDialog = ref(false)
const showStockDialog = ref(false)
const stockForm = ref({
  adjustmentType: 'add',
  quantity: 0,
  remark: ''
})
const stockFormRef = ref()

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
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
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

const getLogModuleName = (module) => {
  const map = { logistics: '物流', fba_inventory: 'FBA库存', fba_reserved: 'FBA预留' }
  return map[module] || module
}
const getLogModuleType = (module) => {
  const map = { logistics: 'success', fba_inventory: 'warning', fba_reserved: 'info' }
  return map[module] || 'info'
}
const getLogActionName = (action) => {
  const map = { upload: '上传', delete: '删除', update: '更新', status_change: '状态变更' }
  return map[action] || action
}
const getLogActionType = (action) => {
  const map = { upload: 'success', delete: 'danger', update: 'warning', status_change: 'info' }
  return map[action] || 'info'
}
const formatLogTime = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const loadSkuLogs = async () => {
  logLoading.value = true
  try {
    const data = await apiService.skuInventoryLog.getLogsBySku(sku.value, {
      page: logPage.value,
      pageSize: logPageSize.value
    })
    if (logPage.value === 1) {
      skuLogs.value = data.list || []
    } else {
      skuLogs.value.push(...(data.list || []))
    }
    logTotal.value = data.pagination?.total || 0
  } catch (error) {
    console.error('加载SKU日志失败:', error)
  } finally {
    logLoading.value = false
  }
}

const loadMoreLogs = () => {
  logPage.value++
  loadSkuLogs()
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

// 加载商品详情
const loadProductDetail = async () => {
  loading.value = true
  try {
    const data = await apiService.products.getDetail(sku.value)
    product.value = data
  } catch (error) {
    ElMessage.error('加载商品详情失败: ' + (error.message || '未知错误'))
    product.value = null
  } finally {
    loading.value = false
  }
}

// 刷新数据
const refreshData = () => {
  loadProductDetail()
}

// 编辑商品
const handleEdit = () => {
  showEditDialog.value = true
}

// 保存编辑
const handleSaveEdit = async (updatedProduct) => {
  try {
    await apiService.products.update(product.value.seller_sku, updatedProduct)
    ElMessage.success('更新成功')
    showEditDialog.value = false
    loadProductDetail()
  } catch (error) {
    ElMessage.error('更新失败: ' + error.message)
  }
}

// 删除商品
const handleDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除商品 "${product.value.seller_sku}" 吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await apiService.products.delete(product.value.seller_sku)
    ElMessage.success('删除成功')
    router.push('/products')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

// 创建订单
const handleAddToOrder = () => {
  ElMessage.info('订单创建功能开发中...')
}

// 调整库存
const handleAdjustStock = () => {
  stockForm.value = {
    adjustmentType: 'add',
    quantity: 0,
    remark: ''
  }
  showStockDialog.value = true
}

// 确认库存调整
const confirmStockAdjustment = async () => {
  try {
    if (!stockFormRef.value) return
    
    await stockFormRef.value.validate()
    
    // 计算新库存数量
    let newQuantity = product.value.quantity
    const adjustment = parseInt(stockForm.value.quantity)
    
    switch (stockForm.value.adjustmentType) {
      case 'add':
        newQuantity += adjustment
        break
      case 'subtract':
        newQuantity = Math.max(0, newQuantity - adjustment)
        break
      case 'set':
        newQuantity = Math.max(0, adjustment)
        break
    }
    
    // 更新库存
    await apiService.products.update(product.value.seller_sku, {
      quantity: newQuantity
    })
    
    ElMessage.success('库存调整成功')
    showStockDialog.value = false
    loadProductDetail()
  } catch (error) {
    if (error.errors) {
      ElMessage.warning('请检查表单填写是否正确')
    } else {
      ElMessage.error('库存调整失败: ' + error.message)
    }
  }
}

// 打印标签
const handlePrint = () => {
  ElMessage.info('打印功能开发中...')
}

// 初始化
onMounted(() => {
  if (!sku.value) {
    ElMessage.warning('商品SKU不能为空')
    router.push('/products')
    return
  }

  loadProductDetail()
  loadSkuLogs()
})
</script>

<style scoped>
.product-detail-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 120px);
}

/* 返回导航 */
.back-navigation {
  margin-bottom: 20px;
}

/* 加载状态 */
.loading-container {
  padding: 40px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 主内容区 */
.detail-content {
  animation: fadeIn 0.3s ease;
}

/* 卡片样式 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
}

.card-title {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.card-actions {
  display: flex;
  gap: 12px;
}

/* 描述列表 */
.desc-label {
  font-weight: bold;
  background-color: #f5f7fa;
}

/* 图片区域 */
.image-wrapper {
  text-align: center;
  padding: 20px 0;
}

.product-image {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.no-image {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #909399;
  background-color: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 20px;
}

.no-image p {
  margin-top: 16px;
  color: #909399;
}

.image-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
}

/* 快捷操作 */
.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-actions .el-button {
  justify-content: flex-start;
  padding: 12px 20px;
}

/* 统计卡片 */
.stats-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.stat-item:hover {
  background-color: #e4e7ed;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

/* 字体样式 */
span.price-text {
  color: #e6a23c;
  font-weight: bold;
}

/* 未找到商品 */
.not-found {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

/* 日志卡片 */
.log-card {
  margin-top: 20px;
}
.log-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
}
.log-loading, .log-empty {
  text-align: center;
  padding: 20px;
  color: #909399;
}
.log-list {
  max-height: 400px;
  overflow-y: auto;
}
.log-item {
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}
.log-item:last-child {
  border-bottom: none;
}
.log-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.log-time {
  font-size: 12px;
  color: #909399;
  margin-left: auto;
}
.log-body {
  font-size: 13px;
  color: #606266;
  display: flex;
  align-items: center;
  gap: 6px;
}
.log-change {
  font-weight: bold;
  font-size: 14px;
}
.change-add { color: #67c23a; }
.change-minus { color: #f56c6c; }
.change-zero { color: #909399; }
.log-qty {
  color: #909399;
  font-size: 12px;
}
.log-remarks {
  color: #303133;
}
.log-footer {
  margin-top: 4px;
  font-size: 12px;
  color: #c0c4cc;
}
.log-more {
  text-align: center;
  padding-top: 10px;
}

/* 时间线部分 */
.timeline-section {
  margin-top: 30px;
}

.timeline-section h3 {
  margin-bottom: 20px;
  color: #303133;
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .detail-content .el-row {
    flex-direction: column;
  }
  
  .detail-content .el-col {
    width: 100%;
    margin-bottom: 20px;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .card-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>