<template>
  <el-dialog
    v-model="dialogVisible"
    title="FBA库存详情"
    width="1050px"
    :close-on-click-modal="false"
    class="inventory-detail-dialog"
  >
    <div v-if="data" class="detail-container">
      <!-- 顶部摘要区 -->
      <div class="detail-summary">
        <div class="summary-header">
          <div class="summary-sku">
            <span class="label">SKU:</span>
            <span class="value">{{ data.sku }}</span>
          </div>
          <div class="summary-asin">
            <span class="label">ASIN:</span>
            <span class="value">{{ data.asin }}</span>
          </div>
          <div class="summary-fnsku">
            <span class="label">FNSKU:</span>
            <span class="value">{{ data.fnsku }}</span>
          </div>
        </div>

        <div class="summary-product">
          <span class="product-name">{{ data.product_name }}</span>
        </div>

        <div class="summary-tags">
          <el-tag
            v-for="tag in data.inventoryTags || []"
            :key="tag.label"
            size="small"
            :type="tag.type"
          >
            {{ tag.label }}
          </el-tag>
          <el-popover
            placement="bottom-start"
            :width="720"
            trigger="hover"
          >
            <template #reference>
              <el-icon class="detail-status-help-icon">
                <QuestionFilled />
              </el-icon>
            </template>
            <InventoryStatusHelp />
          </el-popover>
        </div>

        <div class="summary-stats">
          <div class="stat-item">
            <span class="stat-label">可售库存</span>
            <span class="stat-value" :class="data.available === 0 ? 'stat-danger' : ''">{{ data.available || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">近30天销量</span>
            <span class="stat-value">{{ data.units_shipped_t30 || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">可售天数</span>
            <span class="stat-value" :class="getDaysClass(data.days_of_supply, data.units_shipped_t30)">{{ formatDaysOfSupply(data) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">入库中</span>
            <span class="stat-value" :class="data.inbound_quantity > 0 ? 'stat-primary' : ''">{{ data.inbound_quantity || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">仓间调拨</span>
            <span class="stat-value" :class="data.reserved_fc_transfer > 0 ? 'stat-primary' : ''">{{ data.reserved_fc_transfer || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">总保留</span>
            <span class="stat-value" :class="data.total_reserved_quantity > 0 ? 'stat-warning' : ''">{{ data.total_reserved_quantity || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">补货判断</span>
            <span class="stat-value">{{ data.replenishment_cover_inventory || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">不可售</span>
            <span class="stat-value" :class="data.unfulfillable_quantity > 0 ? 'stat-purple' : ''">{{ data.unfulfillable_quantity || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">预计过剩</span>
            <span class="stat-value" :class="data.estimated_excess_quantity > 0 ? 'stat-danger' : ''">{{ data.estimated_excess_quantity || 0 }}</span>
          </div>
        </div>

        <!-- 运营建议 -->
        <div class="suggestion-box" :class="getSuggestionClass()">
          <div class="suggestion-title">
            <el-icon><InfoFilled /></el-icon>
            运营建议
          </div>
          <div class="suggestion-content">
            {{ formatSuggestion(data.operational_suggestion) }}
          </div>
        </div>
      </div>

      <!-- Tab分组内容 -->
      <el-tabs v-model="activeTab" class="detail-tabs">
        <!-- 分组1：商品基础信息 -->
        <el-tab-pane label="商品基础信息" name="basic">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="SKU">{{ data.sku }}</el-descriptions-item>
            <el-descriptions-item label="FNSKU">{{ data.fnsku }}</el-descriptions-item>
            <el-descriptions-item label="ASIN">{{ data.asin }}</el-descriptions-item>
            <el-descriptions-item label="商品状况">{{ data.condition || '-' }}</el-descriptions-item>
            <el-descriptions-item label="站点">{{ data.marketplace || '-' }}</el-descriptions-item>
            <el-descriptions-item label="快照日期">{{ data.snapshot_date || '-' }}</el-descriptions-item>
            <el-descriptions-item label="最后更新">{{ formatDate(data.last_updated) }}</el-descriptions-item>
            <el-descriptions-item label="商品名称" :span="2">{{ data.product_name || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <!-- 分组2：库存实时状态 -->
        <el-tab-pane label="库存实时状态" name="inventory">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="可售库存">
              <span class="highlight-value">{{ data.available || 0 }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="移除中库存">{{ data.pending_removal_quantity || 0 }}</el-descriptions-item>
            <el-descriptions-item label="不可售库存">
              <span :class="data.unfulfillable_quantity > 0 ? 'danger-text' : ''">{{ data.unfulfillable_quantity || 0 }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="仓间调拨保留">{{ data.reserved_fc_transfer || 0 }}</el-descriptions-item>
            <el-descriptions-item label="仓内处理中">{{ data.reserved_fc_processing || 0 }}</el-descriptions-item>
            <el-descriptions-item label="客户订单保留">{{ data.reserved_customer_order || 0 }}</el-descriptions-item>
            <el-descriptions-item label="总保留库存">
              <span :class="data.total_reserved_quantity > 0 ? 'warning-text' : ''">{{ data.total_reserved_quantity || 0 }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="入库中库存">{{ data.inbound_quantity || 0 }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <!-- 分组3：销售表现 -->
        <el-tab-pane label="销售表现" name="sales">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="近7天销量">{{ data.units_shipped_t7 || 0 }}</el-descriptions-item>
            <el-descriptions-item label="近30天销量">{{ data.units_shipped_t30 || 0 }}</el-descriptions-item>
            <el-descriptions-item label="近60天销量">{{ data.units_shipped_t60 || 0 }}</el-descriptions-item>
            <el-descriptions-item label="近90天销量">{{ data.units_shipped_t90 || 0 }}</el-descriptions-item>
            <el-descriptions-item label="7天日均销量">{{ (data.daily_sales_t7 || 0).toFixed(2) }}</el-descriptions-item>
            <el-descriptions-item label="30天日均销量">{{ (data.daily_sales_t30 || 0).toFixed(2) }}</el-descriptions-item>
            <el-descriptions-item label="90天日均销量">{{ (data.daily_sales_t90 || 0).toFixed(2) }}</el-descriptions-item>
            <el-descriptions-item label="销量趋势系数">
              <span :class="getTrendClass(data.sales_trend_ratio)">{{ (data.sales_trend_ratio || 0).toFixed(2) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="售出率">
              {{ data.sell_through ? (data.sell_through * 100).toFixed(2) + '%' : '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="销售排名">{{ data.sales_rank || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <!-- 分组4：价格与竞争 -->
        <el-tab-pane label="价格与竞争" name="price">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="你的价格">
              <span class="price-value">${{ formatNumber(data.your_price) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="销售价格">${{ formatNumber(data.sales_price) }}</el-descriptions-item>
            <el-descriptions-item label="购物车价格">${{ formatNumber(data.buybox_price) }}</el-descriptions-item>
            <el-descriptions-item label="全新最低价(含运费)">${{ formatNumber(data.lowest_price_new_plus_shipping) }}</el-descriptions-item>
            <el-descriptions-item label="二手最低价">${{ formatNumber(data.lowest_price_used) }}</el-descriptions-item>
            <el-descriptions-item label="特色优惠价">${{ formatNumber(data.featuredoffer_price) }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <!-- 分组5：补货与在途 -->
        <el-tab-pane label="补货与在途" name="replenish">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="可售天数">
              <span :class="getDaysClass(data.days_of_supply, data.units_shipped_t30)">{{ formatDaysOfSupply(data) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="历史可售天数">{{ data.historical_days_of_supply || '-' }}</el-descriptions-item>
            <el-descriptions-item label="补货判断库存">{{ data.replenishment_cover_inventory || 0 }}</el-descriptions-item>
            <el-descriptions-item label="含保留调拨可售天数">{{ data.estimated_cover_days_with_reserved != null ? data.estimated_cover_days_with_reserved : '-' }}</el-descriptions-item>
            <el-descriptions-item label="立即可售天数">{{ data.immediate_cover_days != null ? data.immediate_cover_days : '-' }}</el-descriptions-item>
            <el-descriptions-item label="可恢复保留库存">{{ data.recoverable_reserved_inventory || 0 }}</el-descriptions-item>
            <el-descriptions-item label="入库中库存">{{ data.inbound_quantity || 0 }}</el-descriptions-item>
            <el-descriptions-item label="FBA最低库存水平">{{ data.fba_minimum_inventory_level || '-' }}</el-descriptions-item>
            <el-descriptions-item label="建议发货数量">{{ data.recommended_ship_in_quantity || '-' }}</el-descriptions-item>
            <el-descriptions-item label="建议发货日期">{{ data.recommended_ship_in_date || '-' }}</el-descriptions-item>
            <el-descriptions-item label="30天覆盖周数">{{ data.weeks_of_cover_t30 || '-' }}</el-descriptions-item>
            <el-descriptions-item label="90天覆盖周数">{{ data.weeks_of_cover_t90 || '-' }}</el-descriptions-item>
            <el-descriptions-item label="FBA库存健康状态">
              <el-tag size="small" :type="getHealthType(data.fba_inventory_level_health_status)">
                {{ data.status_text || '-' }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <!-- 分组6：库龄与仓储费 -->
        <el-tab-pane label="库龄与仓储费" name="age">
          <el-descriptions :column="3" border>
            <el-descriptions-item label="0-90天">{{ data.inv_age_0_to_90_days || 0 }}</el-descriptions-item>
            <el-descriptions-item label="91-180天">{{ data.inv_age_91_to_180_days || 0 }}</el-descriptions-item>
            <el-descriptions-item label="181-270天">
              <span :class="(data.inv_age_181_to_270_days || 0) > 0 ? 'warning-text' : ''">{{ data.inv_age_181_to_270_days || 0 }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="271-365天">
              <span :class="(data.inv_age_271_to_365_days || 0) > 0 ? 'danger-text' : ''">{{ data.inv_age_271_to_365_days || 0 }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="365天以上">
              <span :class="(data.inv_age_456_plus_days || 0) > 0 ? 'danger-text' : ''">{{ data.inv_age_456_plus_days || 0 }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="181天以上库存">
              <span class="highlight-value">{{ data.aged_inventory_181_plus || 0 }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="366天以上库存">
              <span class="danger-text">{{ data.aged_inventory_366_plus || 0 }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="下月预计仓储费">
              <span class="price-value">${{ formatNumber(data.estimated_storage_cost_next_month) }}</span>
            </el-descriptions-item>
          </el-descriptions>

          <el-divider content-position="left">库龄风险判断</el-divider>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="FBA相关库存">
              <span class="highlight-value">{{ data.fba_related_inventory || 0 }}</span>
              <span class="field-note">（可售+保留+不可售+移除中）</span>
            </el-descriptions-item>
            <el-descriptions-item label="库龄风险状态">
              <el-tag v-if="data.has_aged_inventory_risk" type="danger" size="small">存在库龄风险</el-tag>
              <el-tag v-else type="success" size="small">无库龄风险</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="高库龄风险状态" :span="2">
              <el-tag v-if="data.has_high_aged_inventory_risk" type="danger" size="small">存在高库龄风险</el-tag>
              <el-tag v-else type="success" size="small">无高库龄风险</el-tag>
            </el-descriptions-item>
          </el-descriptions>

          <!-- 无可售库存但有老库存的解释 -->
          <div v-if="data.available === 0 && data.aged_inventory_181_plus > 0" class="aged-inventory-note">
            <el-alert type="warning" :closable="false" show-icon>
              <template #title>
                <strong>无可售库存但存在老库存说明</strong>
              </template>
              <template #default>
                该SKU当前无可售库存（available=0），但仍存在{{ data.aged_inventory_181_plus }}件181天以上库存。
                这些老库存在保留、不可售、移除中或仓内处理状态，请查看"库存实时状态"分组确认具体分布。
              </template>
            </el-alert>
          </div>

          <el-divider content-position="left">库龄附加费</el-divider>
          <el-descriptions :column="3" border size="small">
            <el-descriptions-item label="181-210天数量">{{ data.quantity_ais_181_210_days || 0 }}</el-descriptions-item>
            <el-descriptions-item label="211-240天数量">{{ data.quantity_ais_211_240_days || 0 }}</el-descriptions-item>
            <el-descriptions-item label="241-270天数量">{{ data.quantity_ais_241_270_days || 0 }}</el-descriptions-item>
            <el-descriptions-item label="271-300天数量">{{ data.quantity_ais_271_300_days || 0 }}</el-descriptions-item>
            <el-descriptions-item label="301-330天数量">{{ data.quantity_ais_301_330_days || 0 }}</el-descriptions-item>
            <el-descriptions-item label="331-365天数量">{{ data.quantity_ais_331_365_days || 0 }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <!-- 分组7：过剩与建议 -->
        <el-tab-pane label="过剩与建议" name="excess">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="预计过剩库存">
              <span :class="(data.estimated_excess_quantity || 0) > 0 ? 'danger-text' : ''">
                {{ data.estimated_excess_quantity || 0 }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="过剩库存阈值">{{ data.excess_threshold || '-' }}</el-descriptions-item>
            <el-descriptions-item label="亚马逊建议动作" :span="2">{{ data.recommended_action || '-' }}</el-descriptions-item>
            <el-descriptions-item label="建议移除数量">{{ data.recommended_removal_quantity || '-' }}</el-descriptions-item>
            <el-descriptions-item label="预计节省成本">${{ formatNumber(data.estimated_cost_savings) }}</el-descriptions-item>
            <el-descriptions-item label="库存提醒">{{ data.alert || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <!-- 分组8：全部原始字段 -->
        <el-tab-pane label="全部原始字段" name="raw">
          <el-collapse v-model="rawExpanded">
            <el-collapse-item title="点击展开全部原始字段" name="raw-fields">
              <div class="raw-fields-grid">
                <template v-for="(value, key) in data._raw || data" :key="key">
                  <div v-if="!isSystemField(key)" class="raw-field-item">
                    <span class="raw-field-key">{{ key }}</span>
                    <span class="raw-field-value">{{ formatFieldValue(value) }}</span>
                  </div>
                </template>
              </div>
            </el-collapse-item>
          </el-collapse>
        </el-tab-pane>
      </el-tabs>
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
      <el-button type="primary" @click="handleReplenish">发起补货</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { InfoFilled, QuestionFilled } from '@element-plus/icons-vue'
import InventoryStatusHelp from '../../../components/fba/InventoryStatusHelp.vue'

const dialogVisible = ref(false)
const data = ref(null)
const activeTab = ref('basic')
const rawExpanded = ref(false)

const formatNumber = (value) => {
  if (value === undefined || value === null || value === '') return '0.00'
  return parseFloat(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatFieldValue = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return value.toString()
  return String(value)
}

// 格式化运营建议（数组转纯文本）
const formatSuggestion = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join('；')
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean).join('；')
      }
    } catch (e) {}
    return value
  }
  return '-'
}

// 格式化可售天数（无销量时显示 "-"）
const formatDaysOfSupply = (row) => {
  const units30 = parseInt(row.units_shipped_t30) || 0
  const days = parseInt(row.days_of_supply) || 0
  if (units30 === 0) return '-'
  return days
}

const isSystemField = (key) => {
  return ['inventoryTags', 'operation_suggestion', 'daily_sales_t7', 'daily_sales_t30',
    'daily_sales_t90', 'sales_trend_ratio', 'total_available_with_inbound',
    'estimated_cover_days_with_inbound', 'aged_inventory_181_plus', 'aged_inventory_271_plus', '_raw'].includes(key)
}

const getDaysClass = (days, unitsShippedT30) => {
  const d = parseInt(days) || 0
  const u = parseInt(unitsShippedT30) || 0
  // 无销量时不显示红色
  if (u === 0) return ''
  if (d === 0) return 'danger-text'
  if (d < 20) return 'danger-text'
  if (d < 45) return 'warning-text'
  if (d > 90) return 'warning-text'
  return ''
}

const getTrendClass = (ratio) => {
  const r = parseFloat(ratio) || 0
  if (r > 1.2) return 'success-text'
  if (r < 0.8) return 'danger-text'
  return ''
}

const getHealthType = (status) => {
  if (!status) return 'info'
  const s = status.toLowerCase()
  if (s.includes('healthy')) return 'success'
  if (s.includes('low stock')) return 'warning'
  if (s.includes('excess') || s.includes('out of stock')) return 'danger'
  return 'info'
}

const getSuggestionClass = () => {
  const tags = (data.value?.inventoryTags || []).map(t => t.label)
  if (tags.includes('断货风险') || tags.includes('Out of stock') || tags.includes('压货风险')) {
    return 'suggestion-danger'
  }
  if (tags.includes('库龄风险') || tags.includes('高库龄风险') || tags.includes('不可售异常')) {
    return 'suggestion-warning'
  }
  if (tags.includes('库存健康')) {
    return 'suggestion-success'
  }
  return 'suggestion-info'
}

const open = (rowData) => {
  data.value = rowData
  activeTab.value = 'basic'
  rawExpanded.value = false
  dialogVisible.value = true
}

const handleReplenish = () => {
  if (data.value) {
    ElMessage.info(`发起补货：SKU=${data.value.sku}, ASIN=${data.value.asin}, 可售=${data.value.available}, 30天销量=${data.value.units_shipped_t30}`)
  }
  dialogVisible.value = false
}

defineExpose({ open })
</script>

<style scoped>
.detail-container {
  max-height: 75vh;
  overflow-y: auto;
}

/* 摘要区样式 */
.detail-summary {
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.summary-header {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
}

.summary-sku,
.summary-asin,
.summary-fnsku {
  font-size: 14px;
}

.summary-sku .label,
.summary-asin .label,
.summary-fnsku .label {
  color: #909399;
}

.summary-sku .value,
.summary-asin .value,
.summary-fnsku .value {
  font-weight: bold;
  color: #303133;
  margin-left: 4px;
}

.summary-product {
  margin-bottom: 12px;
}

.summary-product .product-name {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.summary-stats {
  display: flex;
  gap: 24px;
  padding: 12px 0;
  border-top: 1px solid #dcdfe6;
  border-bottom: 1px solid #dcdfe6;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-item .stat-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-item .stat-value {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.stat-item .stat-value.stat-danger {
  color: #f56c6c;
}

.stat-item .stat-value.stat-primary {
  color: #409eff;
}

.stat-item .stat-value.stat-purple {
  color: #9c27b0;
}

/* 运营建议框 */
.suggestion-box {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 6px;
  border-left: 4px solid;
}

.suggestion-box.suggestion-danger {
  background: #fef0f0;
  border-left-color: #f56c6c;
}

.suggestion-box.suggestion-warning {
  background: #fdf6ec;
  border-left-color: #e6a23c;
}

.suggestion-box.suggestion-success {
  background: #f0f9eb;
  border-left-color: #67c23a;
}

.suggestion-box.suggestion-info {
  background: #f4f4f5;
  border-left-color: #909399;
}

.suggestion-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.suggestion-content {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

/* Tab样式 */
.detail-tabs {
  margin-top: 16px;
}

/* 文字颜色 */
.danger-text {
  color: #f56c6c;
  font-weight: bold;
}

.warning-text {
  color: #e6a23c;
}

.success-text {
  color: #67c23a;
}

.highlight-value {
  color: #409eff;
  font-weight: bold;
}

.price-value {
  color: #67c23a;
  font-weight: bold;
}

/* 原始字段网格 */
.raw-fields-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.raw-field-item {
  display: flex;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
}

.raw-field-key {
  flex: 0 0 45%;
  font-size: 12px;
  color: #909399;
  word-break: break-all;
}

.raw-field-value {
  flex: 0 0 55%;
  font-size: 12px;
  color: #303133;
  word-break: break-all;
  padding-left: 8px;
}

.el-divider {
  margin: 16px 0;
}

/* 库龄风险说明 */
.aged-inventory-note {
  margin-top: 12px;
}

.field-note {
  font-size: 11px;
  color: #909399;
  margin-left: 4px;
}

/* 详情页状态帮助图标 */
.detail-status-help-icon {
  margin-left: 4px;
  color: #909399;
  cursor: pointer;
  font-size: 14px;
  vertical-align: middle;
  transition: color 0.2s;
}

.detail-status-help-icon:hover {
  color: #409EFF;
}
</style>
