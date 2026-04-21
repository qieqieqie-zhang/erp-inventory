<template>
  <div class="logistics-detail-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <el-button :icon="ArrowLeft" @click="goBack">返回列表</el-button>
      <h2>物流详情</h2>
    </div>

    <!-- 物流基本信息 -->
    <el-card shadow="never" class="info-card">
      <template #header>
        <div class="card-header">
          <span>物流信息</span>
          <el-tag :type="getStatusType(currentLogistics?.logistics_status)">
            {{ getStatusLabel(currentLogistics?.logistics_status) }}
          </el-tag>
        </div>
      </template>

      <el-descriptions :column="3" border>
        <el-descriptions-item label="FBA仓库编号">{{ currentLogistics?.fba_warehouse_number || '-' }}</el-descriptions-item>
        <el-descriptions-item label="Reference ID">{{ currentLogistics?.reference_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="物流单号">{{ currentLogistics?.tracking_number || '-' }}</el-descriptions-item>
        <el-descriptions-item label="目的国家">{{ currentLogistics?.destination_country || '-' }}</el-descriptions-item>
        <el-descriptions-item label="运输方式">{{ currentLogistics?.shipping_method || '-' }}</el-descriptions-item>
        <el-descriptions-item label="起运地">{{ currentLogistics?.forwarder_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="发货日期">{{ currentLogistics?.ship_date ? formatDate(currentLogistics.ship_date) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="发货数量">{{ currentLogistics?.ship_quantity || 0 }}</el-descriptions-item>
        <el-descriptions-item label="箱数">{{ currentLogistics?.carton_count || 0 }}</el-descriptions-item>
        <el-descriptions-item label="单价">${{ formatNumber(currentLogistics?.unit_price) }}</el-descriptions-item>
        <el-descriptions-item label="总价">${{ formatNumber(currentLogistics?.total_price) }}</el-descriptions-item>
        <el-descriptions-item label="ETA">{{ currentLogistics?.eta ? formatDate(currentLogistics.eta) : '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 商品信息 -->
    <el-card shadow="never" class="info-card">
      <template #header>
        <div class="card-header">
          <span>商品信息</span>
        </div>
      </template>

      <el-descriptions :column="3" border>
        <el-descriptions-item label="SKU编号">{{ currentLogistics?.sku_code || '-' }}</el-descriptions-item>
        <el-descriptions-item label="中文品名">{{ currentLogistics?.sku_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="英文品名">{{ currentLogistics?.sku_name_en || '-' }}</el-descriptions-item>
        <el-descriptions-item label="海关编码">{{ currentLogistics?.customs_code || '-' }}</el-descriptions-item>
        <el-descriptions-item label="品牌">{{ currentLogistics?.brand || '-' }}</el-descriptions-item>
        <el-descriptions-item label="材质">{{ currentLogistics?.material || '-' }}</el-descriptions-item>
        <el-descriptions-item label="用途">{{ currentLogistics?.purpose || '-' }}</el-descriptions-item>
        <el-descriptions-item label="ASIN">{{ currentLogistics?.asin || '-' }}</el-descriptions-item>
        <el-descriptions-item label="是否带电">{{ currentLogistics?.has_battery || '-' }}</el-descriptions-item>
        <el-descriptions-item label="型号">{{ currentLogistics?.model || '-' }}</el-descriptions-item>
        <el-descriptions-item label="单位">{{ currentLogistics?.unit || '-' }}</el-descriptions-item>
        <el-descriptions-item label="每套个数">{{ currentLogistics?.quantity_per_set || 0 }}</el-descriptions-item>
      </el-descriptions>

      <el-descriptions :column="4" border style="margin-top: 20px;">
        <el-descriptions-item label="箱号段">{{ currentLogistics?.carton_number_range || '-' }}</el-descriptions-item>
        <el-descriptions-item label="投保单价">¥{{ formatNumber(currentLogistics?.insurance_price) }}</el-descriptions-item>
        <el-descriptions-item label="单箱重量">{{ currentLogistics?.carton_weight || 0 }} kg</el-descriptions-item>
        <el-descriptions-item label="单箱尺寸">{{ currentLogistics?.carton_length || 0 }}×{{ currentLogistics?.carton_width || 0 }}×{{ currentLogistics?.carton_height || 0 }} cm</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- SKU子列表 -->
    <el-card shadow="never" class="info-card">
      <template #header>
        <div class="card-header">
          <span>SKU明细</span>
          <div>
            <el-button type="primary" :icon="Upload" @click="showSkuUploadDialog = true">上传SKU</el-button>
            <el-button type="success" :icon="Refresh" :loading="syncLoading" @click="handleSyncProducts">同步商品</el-button>
            <el-button :icon="Refresh" @click="fetchSkuList">刷新</el-button>
            <el-button type="danger" :disabled="selectedSkuList.length === 0" @click="handleBatchDeleteSku">批量删除{{ selectedSkuList.length > 0 ? `(${selectedSkuList.length})` : '' }}</el-button>
          </div>
        </div>
      </template>

      <el-table ref="skuTableRef" :data="skuList" v-loading="skuLoading" stripe border @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="sku_code" label="SKU编号" width="120" />
        <el-table-column prop="sku_name" label="商品名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="quantity" label="数量" width="100" align="center" />
        <el-table-column prop="unit_price" label="单价" width="100" align="right">
          <template #default="{ row }">
            ${{ formatNumber(row.unit_price) }}
          </template>
        </el-table-column>
        <el-table-column prop="total_price" label="总价" width="100" align="right">
          <template #default="{ row }">
            ${{ formatNumber(row.total_price) }}
          </template>
        </el-table-column>
        <el-table-column prop="remarks" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" size="small" @click="handleDeleteSku(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="skuList.length === 0 && !skuLoading" class="empty-sku">
        <el-empty description="暂无SKU数据" />
      </div>
    </el-card>

    <!-- 时间节点 -->
    <el-card shadow="never" class="info-card">
      <template #header>
        <div class="card-header">
          <span>时间节点</span>
        </div>
      </template>

      <el-descriptions :column="2" border>
        <el-descriptions-item label="ETD">{{ currentLogistics?.etd ? formatDate(currentLogistics.etd) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="ETA">{{ currentLogistics?.eta ? formatDate(currentLogistics.eta) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="提柜时间">{{ currentLogistics?.pickup_time ? formatDate(currentLogistics.pickup_time) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="派送时间">{{ currentLogistics?.delivery_time ? formatDate(currentLogistics.delivery_time) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="FBA开始接收">{{ currentLogistics?.fba_start_receive_time ? formatDate(currentLogistics.fba_start_receive_time) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="上传时间">{{ currentLogistics?.upload_time ? formatDate(currentLogistics.upload_time) : '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 备注 -->
    <el-card shadow="never" class="info-card">
      <template #header>
        <div class="card-header">
          <span>备注</span>
        </div>
      </template>
      <div>{{ currentLogistics?.remarks || '无备注' }}</div>
    </el-card>

    <!-- SKU上传对话框 -->
    <UploadDialog
      v-model="showSkuUploadDialog"
      title="上传SKU"
      accept=".xlsx,.xls,.csv"
      :upload-fn="uploadSkuList"
      :extra-fields="{ logisticsId: currentLogistics?.id }"
      :preview-fn="previewSkuFile"
      upload-tip="请上传亚马逊Send to Amazon模版文件"
      @success="fetchSkuList"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Upload, Refresh } from '@element-plus/icons-vue'
import { apiService } from '@/utils/api'
import UploadDialog from '@/components/UploadDialog.vue'

const route = useRoute()
const router = useRouter()

const currentLogistics = ref(null)
const skuList = ref([])
const skuLoading = ref(false)
const syncLoading = ref(false)
const showSkuUploadDialog = ref(false)
const selectedSkuList = ref([])
const skuTableRef = ref(null)

const getStatusType = (status) => {
  const types = {
    pending: 'info',
    shipped: 'primary',
    in_transit: 'warning',
    arrived: 'success',
    customs_cleared: 'success',
    delivered: 'success'
  }
  return types[status] || 'info'
}

const getStatusLabel = (status) => {
  const labels = {
    pending: '待发货',
    shipped: '已发货',
    in_transit: '运输中',
    arrived: '已到港',
    customs_cleared: '清关完成',
    delivered: '已派送'
  }
  return labels[status] || status
}

const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN')
}

const formatNumber = (num) => {
  if (!num && num !== 0) return '0'
  return parseFloat(num).toFixed(2)
}

const authHeaders = () => {
  const token = localStorage.getItem('token')
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

const goBack = () => {
  router.push('/logistics')
}

const fetchLogisticsDetail = async () => {
  try {
    const data = await apiService.logistics.getDetail(route.params.id)
    currentLogistics.value = data
    // 尝试解析sku_list字段
    if (data.sku_list) {
      try {
        skuList.value = JSON.parse(data.sku_list)
      } catch (e) {
        skuList.value = []
      }
    }
  } catch (error) {
    ElMessage.error(error.message || '获取详情失败')
  }
}

const fetchSkuList = async () => {
  skuLoading.value = true
  try {
    await fetchLogisticsDetail()
  } finally {
    skuLoading.value = false
  }
}

const handleSyncProducts = async () => {
  if (!currentLogistics.value?.id) {
    ElMessage.warning('请先加载物流记录')
    return
  }
  if (!currentLogistics.value?.fba_warehouse_number) {
    ElMessage.warning('该物流记录缺少FBA仓库编号，无法同步')
    return
  }
  if (!skuList.value || skuList.value.length === 0) {
    ElMessage.warning('没有SKU数据可同步，请先上传SKU文件')
    return
  }
  try {
    syncLoading.value = true
    await apiService.logistics.syncProducts(currentLogistics.value.id)
    ElMessage.success('同步成功，商品列表已更新')
  } catch (error) {
    ElMessage.error(error.message || '同步失败')
  } finally {
    syncLoading.value = false
  }
}
  }
}

const previewSkuFile = async (rawFile) => {
  const fd = new FormData()
  fd.append('file', rawFile)
  const token = localStorage.getItem('token')
  const res = await fetch('http://localhost:3000/api/logistics/preview-sku', {
    method: 'POST',
    headers: { Authorization: token ? `Bearer ${token}` : '' },
    body: fd
  })
  const data = await res.json()
  if (data.code !== 200) throw new Error(data.message)
  return {
    totalRows: data.data.totalRows,
    headers: data.data.headers,
    rows: data.data.rows
  }
}

const uploadSkuList = async (formData) => {
  const token = localStorage.getItem('token')
  const res = await fetch('http://localhost:3000/api/logistics/update-sku-list', {
    method: 'POST',
    headers: { Authorization: token ? `Bearer ${token}` : '' },
    body: formData
  })
  const data = await res.json()
  if (data.code !== 200) throw new Error(data.message)
  return data.data
}

const handleDeleteSku = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这条SKU记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // 从sku_list中移除
    const newList = skuList.value.filter(item => item !== row)
    // 更新数据库
    const response = await fetch(`/api/logistics/${route.params.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ sku_list: JSON.stringify(newList) })
    })
    const result = await response.json()
    if (result.code === 200) {
      ElMessage.success('删除成功')
      skuList.value = newList
    } else {
      ElMessage.error(result.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleSelectionChange = (selection) => {
  selectedSkuList.value = selection
}

const handleBatchDeleteSku = async () => {
  if (selectedSkuList.value.length === 0) return
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedSkuList.value.length} 条SKU记录吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const selectedSet = new Set(selectedSkuList.value.map(item => item.sku_code))
    const newList = skuList.value.filter(item => !selectedSet.has(item.sku_code))
    const response = await fetch(`/api/logistics/${route.params.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ sku_list: JSON.stringify(newList) })
    })
    const result = await response.json()
    if (result.code === 200) {
      ElMessage.success('删除成功')
      skuList.value = newList
      selectedSkuList.value = []
      skuTableRef.value?.clearSelection()
    } else {
      ElMessage.error(result.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  fetchLogisticsDetail()
})
</script>

<style scoped>
.logistics-detail-container {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
}

.info-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.empty-sku {
  padding: 40px 0;
}
</style>
