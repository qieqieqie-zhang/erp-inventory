<template>
  <div class="inventory-alerts">
    <!-- 预警概览 -->
    <div class="alerts-overview">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card shadow="never" class="alert-card critical">
            <div class="alert-item">
              <div class="alert-icon">
                <el-icon><WarningFilled /></el-icon>
              </div>
              <div class="alert-content">
                <div class="alert-value">{{ alertStats.critical || 0 }}</div>
                <div class="alert-label">紧急预警</div>
                <div class="alert-desc">库存为0或即将断货</div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="8">
          <el-card shadow="never" class="alert-card warning">
            <div class="alert-item">
              <div class="alert-icon">
                <el-icon><Warning /></el-icon>
              </div>
              <div class="alert-content">
                <div class="alert-value">{{ alertStats.warning || 0 }}</div>
                <div class="alert-label">一般预警</div>
                <div class="alert-desc">库存低于安全水平</div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="8">
          <el-card shadow="never" class="alert-card overstock">
            <div class="alert-item">
              <div class="alert-icon">
                <el-icon><Box /></el-icon>
              </div>
              <div class="alert-content">
                <div class="alert-value">{{ alertStats.overstock || 0 }}</div>
                <div class="alert-label">积压预警</div>
                <div class="alert-desc">库龄超过90天</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 预警类型切换 -->
    <div class="alert-types">
      <el-tabs v-model="activeAlertType" @tab-change="handleTabChange">
        <el-tab-pane label="紧急预警" name="critical">
          <AlertList
            :type="'critical'"
            :alerts="criticalAlerts"
            @replenish="handleReplenish"
            @ignore="handleIgnoreAlert"
          />
        </el-tab-pane>
        <el-tab-pane label="一般预警" name="warning">
          <AlertList
            :type="'warning'"
            :alerts="warningAlerts"
            @replenish="handleReplenish"
            @ignore="handleIgnoreAlert"
          />
        </el-tab-pane>
        <el-tab-pane label="积压预警" name="overstock">
          <AlertList
            :type="'overstock'"
            :alerts="overstockAlerts"
            @discount="handleDiscount"
            @transfer="handleTransfer"
          />
        </el-tab-pane>
        <el-tab-pane label="已忽略" name="ignored">
          <AlertList
            :type="'ignored'"
            :alerts="ignoredAlerts"
            @restore="handleRestoreAlert"
          />
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 批量操作 -->
    <div v-if="activeAlertType !== 'ignored'" class="batch-actions">
      <el-button
        type="primary"
        :icon="DocumentAdd"
        @click="handleBatchReplenish"
        :disabled="selectedAlerts.length === 0"
      >
        批量创建补货单 ({{ selectedAlerts.length }})
      </el-button>
      <el-button
        :icon="CloseBold"
        @click="handleBatchIgnore"
        :disabled="selectedAlerts.length === 0"
      >
        批量忽略预警
      </el-button>
      <el-button :icon="Download" @click="exportAlerts">
        导出预警列表
      </el-button>
    </div>

    <!-- 预警设置按钮 -->
    <div class="settings-button">
      <el-button
        type="text"
        :icon="Setting"
        @click="showSettings = true"
      >
        预警设置
      </el-button>
    </div>
  </div>

  <!-- 预警设置对话框 -->
  <el-dialog
    v-model="showSettings"
    title="库存预警设置"
    width="600px"
  >
    <AlertSettings @save="handleSaveSettings" />
  </el-dialog>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  WarningFilled,
  Warning,
  Box,
  DocumentAdd,
  CloseBold,
  Download,
  Setting
} from '@element-plus/icons-vue'
import { apiService } from '../../../utils/api'
import AlertList from './AlertList.vue'
import AlertSettings from './AlertSettings.vue'

// 活动预警类型
const activeAlertType = ref('critical')

// 预警数据
const criticalAlerts = ref([])
const warningAlerts = ref([])
const overstockAlerts = ref([])
const ignoredAlerts = ref([])

// 预警统计
const alertStats = ref({
  critical: 0,
  warning: 0,
  overstock: 0,
  ignored: 0
})

// 选中的预警
const selectedAlerts = ref([])

// 设置对话框
const showSettings = ref(false)

// 计算当前活动预警列表
const activeAlertList = computed(() => {
  switch (activeAlertType.value) {
    case 'critical': return criticalAlerts.value
    case 'warning': return warningAlerts.value
    case 'overstock': return overstockAlerts.value
    case 'ignored': return ignoredAlerts.value
    default: return []
  }
})

// 初始化加载数据
onMounted(() => {
  fetchAlerts()
})

// 获取预警数据
const fetchAlerts = async () => {
  try {
    const data = await apiService.fba.inventory.getAlerts()

    if (data && Array.isArray(data)) {
      // 按预警级别分组
      const critical = data.filter(a => a.alert_level === 'critical' || a.type === 'zero')
      const warning = data.filter(a => a.alert_level === 'warning' || a.type === 'low')
      const overstock = data.filter(a => a.alert_level === 'overstock' || a.type === 'excess')

      criticalAlerts.value = critical.map((a, i) => ({
        id: i + 1,
        sku: a.sku || a.seller_sku,
        product_name: a.product_name || a.item_name,
        current_stock: a.quantity || a.current_stock || 0,
        alert_level: 'critical',
        alert_message: a.description || a.alert_message || '库存异常',
        last_updated: a.last_updated || new Date().toISOString()
      }))

      warningAlerts.value = warning.map((a, i) => ({
        id: critical.length + i + 1,
        sku: a.sku || a.seller_sku,
        product_name: a.product_name || a.item_name,
        current_stock: a.quantity || a.current_stock || 0,
        alert_level: 'warning',
        alert_message: a.description || a.alert_message || '库存偏低',
        last_updated: a.last_updated || new Date().toISOString()
      }))

      overstockAlerts.value = overstock.map((a, i) => ({
        id: critical.length + warning.length + i + 1,
        sku: a.sku || a.seller_sku,
        product_name: a.product_name || a.item_name,
        current_stock: a.quantity || a.current_stock || 0,
        alert_level: 'overstock',
        alert_message: a.description || a.alert_message || '库存积压',
        last_updated: a.last_updated || new Date().toISOString()
      }))

      ignoredAlerts.value = []
    } else {
      criticalAlerts.value = []
      warningAlerts.value = []
      overstockAlerts.value = []
      ignoredAlerts.value = []
    }

    // 更新统计
    alertStats.value = {
      critical: criticalAlerts.value.length,
      warning: warningAlerts.value.length,
      overstock: overstockAlerts.value.length,
      ignored: ignoredAlerts.value.length
    }
    
  } catch (error) {
    console.error('获取预警数据失败:', error)
    ElMessage.error('获取预警数据失败')
  }
}

// 标签切换
const handleTabChange = () => {
  selectedAlerts.value = []
}

// 补货处理
const handleReplenish = (alert) => {
  ElMessageBox.confirm(
    `是否要为商品 "${alert.product_name}" (SKU: ${alert.sku}) 创建补货单？`,
    '创建补货单',
    {
      confirmButtonText: '创建',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // 调用创建补货单接口
    ElMessage.success(`已为 ${alert.sku} 创建补货单`)
    
    // 从预警列表中移除
    removeAlertFromList(alert)
  }).catch(() => {
    // 用户取消
  })
}

// 忽略预警
const handleIgnoreAlert = (alert) => {
  ElMessageBox.prompt(
    '请输入忽略原因（可选）',
    `忽略预警 ${alert.sku}`,
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '忽略原因'
    }
  ).then(({ value }) => {
    // 调用忽略预警接口
    console.log('忽略预警:', alert.id, '原因:', value)
    ElMessage.success('预警已忽略')
    
    // 移动到已忽略列表
    moveAlertToIgnored(alert, value)
  }).catch(() => {
    // 用户取消
  })
}

// 恢复预警
const handleRestoreAlert = (alert) => {
  ElMessageBox.confirm(
    '是否要恢复此预警？',
    '恢复预警',
    {
      confirmButtonText: '恢复',
      cancelButtonText: '取消'
    }
  ).then(() => {
    // 调用恢复预警接口
    ElMessage.success('预警已恢复')
    
    // 从已忽略列表移除，重新添加到相应列表
    restoreAlertFromIgnored(alert)
  }).catch(() => {
    // 用户取消
  })
}

// 折扣处理（积压商品）
const handleDiscount = (alert) => {
  ElMessageBox.prompt(
    '请输入折扣率（例如: 30 表示7折）',
    `为积压商品 ${alert.sku} 设置折扣`,
    {
      confirmButtonText: '设置',
      cancelButtonText: '取消',
      inputPlaceholder: '折扣率 (1-99)',
      inputPattern: /^[1-9][0-9]?$/,
      inputErrorMessage: '请输入1-99之间的数字'
    }
  ).then(({ value }) => {
    const discountRate = parseInt(value)
    ElMessage.success(`已为 ${alert.sku} 设置${discountRate}%折扣`)
    
    // 调用设置折扣接口
    console.log('设置折扣:', alert.id, '折扣率:', discountRate)
  }).catch(() => {
    // 用户取消
  })
}

// 库存转移（积压商品）
const handleTransfer = (alert) => {
  ElMessage.info('库存转移功能开发中')
}

// 批量创建补货单
const handleBatchReplenish = () => {
  if (selectedAlerts.value.length === 0) {
    ElMessage.warning('请先选择预警')
    return
  }

  const skus = selectedAlerts.value.map(alert => alert.sku).join(', ')
  ElMessageBox.confirm(
    `是否为选中的 ${selectedAlerts.value.length} 个商品创建批量补货单？\nSKU: ${skus}`,
    '批量创建补货单',
    {
      confirmButtonText: '创建',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // 调用批量补货接口
    ElMessage.success(`已创建批量补货单，包含 ${selectedAlerts.value.length} 个商品`)
    
    // 从预警列表中移除所有选中的预警
    selectedAlerts.value.forEach(alert => {
      removeAlertFromList(alert)
    })
    selectedAlerts.value = []
  }).catch(() => {
    // 用户取消
  })
}

// 批量忽略预警
const handleBatchIgnore = () => {
  if (selectedAlerts.value.length === 0) {
    ElMessage.warning('请先选择预警')
    return
  }

  ElMessageBox.prompt(
    '请输入批量忽略原因（可选）',
    `批量忽略 ${selectedAlerts.value.length} 个预警`,
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '忽略原因'
    }
  ).then(({ value }) => {
    // 调用批量忽略接口
    ElMessage.success(`已批量忽略 ${selectedAlerts.value.length} 个预警`)
    
    // 移动到已忽略列表
    selectedAlerts.value.forEach(alert => {
      moveAlertToIgnored(alert, value)
    })
    selectedAlerts.value = []
  }).catch(() => {
    // 用户取消
  })
}

// 导出预警列表
const exportAlerts = () => {
  const alerts = activeAlertList.value
  if (alerts.length === 0) {
    ElMessage.warning('没有可导出的预警数据')
    return
  }

  const data = JSON.stringify(alerts, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `库存预警_${activeAlertType.value}_${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
  
  ElMessage.success('导出成功')
}

// 保存预警设置
const handleSaveSettings = (settings) => {
  console.log('保存预警设置:', settings)
  ElMessage.success('预警设置已保存')
  showSettings.value = false
  
  // 重新加载预警数据（应用新设置）
  fetchAlerts()
}

// 工具函数：从列表中移除预警
const removeAlertFromList = (alert) => {
  switch (alert.alert_level) {
    case 'critical':
      criticalAlerts.value = criticalAlerts.value.filter(a => a.id !== alert.id)
      alertStats.value.critical = criticalAlerts.value.length
      break
    case 'warning':
      warningAlerts.value = warningAlerts.value.filter(a => a.id !== alert.id)
      alertStats.value.warning = warningAlerts.value.length
      break
    case 'overstock':
      overstockAlerts.value = overstockAlerts.value.filter(a => a.id !== alert.id)
      alertStats.value.overstock = overstockAlerts.value.length
      break
  }
}

// 工具函数：将预警移动到已忽略列表
const moveAlertToIgnored = (alert, reason) => {
  // 从原列表移除
  removeAlertFromList(alert)
  
  // 添加到已忽略列表
  const ignoredAlert = {
    ...alert,
    ignore_reason: reason || '未说明原因',
    ignored_at: new Date().toISOString(),
    ignored_by: '当前用户'
  }
  
  ignoredAlerts.value.unshift(ignoredAlert)
  alertStats.value.ignored = ignoredAlerts.value.length
}

// 工具函数：从已忽略列表恢复预警
const restoreAlertFromIgnored = (alert) => {
  // 从已忽略列表移除
  ignoredAlerts.value = ignoredAlerts.value.filter(a => a.id !== alert.id)
  alertStats.value.ignored = ignoredAlerts.value.length
  
  // 恢复到原列表
  const restoredAlert = { ...alert }
  delete restoredAlert.ignore_reason
  delete restoredAlert.ignored_at
  delete restoredAlert.ignored_by
  
  switch (restoredAlert.alert_level) {
    case 'critical':
      criticalAlerts.value.push(restoredAlert)
      alertStats.value.critical = criticalAlerts.value.length
      break
    case 'warning':
      warningAlerts.value.push(restoredAlert)
      alertStats.value.warning = warningAlerts.value.length
      break
    case 'overstock':
      overstockAlerts.value.push(restoredAlert)
      alertStats.value.overstock = overstockAlerts.value.length
      break
  }
}

// 更新选中的预警
const updateSelectedAlerts = (alerts) => {
  selectedAlerts.value = alerts
}
</script>

<style scoped>
.inventory-alerts {
  padding: 20px;
}

.alerts-overview {
  margin-bottom: 30px;
}

.alert-card {
  border-radius: 8px;
  border: none;
}

.alert-card.critical {
  background: linear-gradient(135deg, #FFF2F0, #FEF0F0);
}

.alert-card.warning {
  background: linear-gradient(135deg, #FFFBE6, #FFF6EC);
}

.alert-card.overstock {
  background: linear-gradient(135deg, #F6FFED, #F0F9EB);
}

.alert-item {
  display: flex;
  align-items: center;
  padding: 16px;
}

.alert-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
}

.alert-card.critical .alert-icon {
  background-color: #FFCCC7;
  color: #F5222D;
}

.alert-card.warning .alert-icon {
  background-color: #FFE58F;
  color: #FA8C16;
}

.alert-card.overstock .alert-icon {
  background-color: #B7EB8F;
  color: #52C41A;
}

.alert-content {
  flex: 1;
}

.alert-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  line-height: 1.2;
  margin-bottom: 4px;
}

.alert-label {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 2px;
}

.alert-desc {
  font-size: 12px;
  color: #909399;
}

.alert-types {
  margin-bottom: 20px;
}

.batch-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  padding: 16px;
  background-color: #F5F7FA;
  border-radius: 4px;
}

.settings-button {
  text-align: right;
  margin-top: 20px;
}

@media (max-width: 768px) {
  .alert-item {
    flex-direction: column;
    text-align: center;
    padding: 12px;
  }
  
  .alert-icon {
    margin-right: 0;
    margin-bottom: 12px;
  }
  
  .batch-actions {
    flex-direction: column;
  }
}
</style>