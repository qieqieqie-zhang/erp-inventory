<template>
  <div class="alert-list">
    <el-table
      :data="alerts"
      style="width: 100%"
      stripe
      border
      @selection-change="handleSelectionChange"
    >
      <el-table-column
        v-if="type !== 'ignored'"
        type="selection"
        width="55"
        align="center"
      />
      
      <el-table-column prop="sku" label="SKU" width="120" />
      <el-table-column prop="product_name" label="商品名称" min-width="200" show-overflow-tooltip />
      
      <el-table-column
        v-if="type === 'critical' || type === 'warning'"
        label="库存信息"
        width="180"
        align="center"
      >
        <template #default="{ row }">
          <div class="stock-info">
            <div class="stock-current">
              <span class="label">当前:</span>
              <span :class="['value', getStockClass(row.current_stock, row.safety_stock)]">
                {{ row.current_stock }}
              </span>
            </div>
            <div class="stock-safety">
              <span class="label">安全:</span>
              <span class="value">{{ row.safety_stock }}</span>
            </div>
            <div class="stock-days">
              <span class="label">可售天数:</span>
              <span class="value">{{ row.days_of_supply }}天</span>
            </div>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column
        v-if="type === 'overstock'"
        label="积压信息"
        width="200"
        align="center"
      >
        <template #default="{ row }">
          <div class="overstock-info">
            <div class="overstock-age">
              <span class="label">库龄:</span>
              <span class="value age-high">{{ row.inventory_age }}天</span>
            </div>
            <div class="overstock-turnover">
              <span class="label">周转率:</span>
              <span class="value">{{ row.turnover_rate }}</span>
            </div>
            <div class="overstock-value">
              <span class="label">仓库价值:</span>
              <span class="value">¥{{ formatCurrency(row.warehouse_value) }}</span>
            </div>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column
        v-if="type === 'ignored'"
        label="忽略信息"
        width="200"
      >
        <template #default="{ row }">
          <div class="ignore-info">
            <div class="ignore-reason">
              <span class="label">原因:</span>
              <span class="value">{{ row.ignore_reason || '未说明' }}</span>
            </div>
            <div class="ignore-time">
              <span class="label">时间:</span>
              <span class="value">{{ formatTime(row.ignored_at) }}</span>
            </div>
            <div class="ignore-by">
              <span class="label">操作人:</span>
              <span class="value">{{ row.ignored_by }}</span>
            </div>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column prop="alert_message" label="预警信息" min-width="200" />
      
      <el-table-column prop="last_updated" label="更新时间" width="160">
        <template #default="{ row }">
          {{ formatTime(row.last_updated) }}
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons">
            <template v-if="type === 'critical' || type === 'warning'">
              <el-button
                type="primary"
                size="small"
                @click="handleReplenish(row)"
              >
                补货
              </el-button>
              <el-button
                size="small"
                @click="handleIgnore(row)"
              >
                忽略
              </el-button>
            </template>
            
            <template v-if="type === 'overstock'">
              <el-button
                type="warning"
                size="small"
                @click="handleDiscount(row)"
              >
                折扣
              </el-button>
              <el-button
                size="small"
                @click="handleTransfer(row)"
              >
                转移
              </el-button>
            </template>
            
            <template v-if="type === 'ignored'">
              <el-button
                type="success"
                size="small"
                @click="handleRestore(row)"
              >
                恢复
              </el-button>
            </template>
          </div>
        </template>
      </el-table-column>
    </el-table>
    
    <!-- 空状态 -->
    <div v-if="alerts.length === 0" class="empty-state">
      <el-empty description="暂无预警数据" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  type: {
    type: String,
    required: true,
    validator: (value) => ['critical', 'warning', 'overstock', 'ignored'].includes(value)
  },
  alerts: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'selection-change',
  'replenish',
  'ignore',
  'restore',
  'discount',
  'transfer'
])

// 选中的行
const selectedRows = ref([])

// 处理选择变化
const handleSelectionChange = (selection) => {
  selectedRows.value = selection
  emit('selection-change', selection)
}

// 处理补货
const handleReplenish = (row) => {
  emit('replenish', row)
}

// 处理忽略
const handleIgnore = (row) => {
  emit('ignore', row)
}

// 处理恢复
const handleRestore = (row) => {
  emit('restore', row)
}

// 处理折扣
const handleDiscount = (row) => {
  emit('discount', row)
}

// 处理转移
const handleTransfer = (row) => {
  emit('transfer', row)
}

// 工具函数
const getStockClass = (current, safety) => {
  if (current === 0) return 'stock-zero'
  if (current < safety * 0.3) return 'stock-critical'
  if (current < safety * 0.5) return 'stock-warning'
  return 'stock-normal'
}

const formatCurrency = (value) => {
  if (value === undefined || value === null) return '0.00'
  return parseFloat(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const formatTime = (timeString) => {
  if (!timeString) return ''
  const date = new Date(timeString)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.alert-list {
  width: 100%;
}

.stock-info,
.overstock-info,
.ignore-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.stock-current,
.stock-safety,
.stock-days,
.overstock-age,
.overstock-turnover,
.overstock-value,
.ignore-reason,
.ignore-time,
.ignore-by {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  color: #909399;
  min-width: 60px;
  text-align: right;
}

.value {
  color: #303133;
  font-weight: 500;
  text-align: left;
  flex: 1;
  padding-left: 8px;
}

.stock-zero {
  color: #F5222D;
  font-weight: bold;
}

.stock-critical {
  color: #FA541C;
  font-weight: bold;
}

.stock-warning {
  color: #FA8C16;
  font-weight: bold;
}

.stock-normal {
  color: #52C41A;
}

.age-high {
  color: #F5222D;
  font-weight: bold;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
  color: #909399;
}

@media (max-width: 768px) {
  .action-buttons {
    flex-direction: column;
  }
  
  .action-buttons .el-button {
    width: 100%;
    margin-bottom: 4px;
  }
}
</style>