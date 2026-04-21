<template>
  <el-dialog
    v-model="dialogVisible"
    title="FBA库存详情"
    width="900px"
    :close-on-click-modal="false"
  >
    <div v-if="data" class="detail-container">
      <!-- 基本信息 -->
      <el-divider content-position="left">基本信息</el-divider>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="SKU">{{ data.seller_sku || data.sku }}</el-descriptions-item>
        <el-descriptions-item label="FNSKU">{{ data.fnsku }}</el-descriptions-item>
        <el-descriptions-item label="ASIN">{{ data.asin }}</el-descriptions-item>
        <el-descriptions-item label="商品名称" :span="2">{{ data.item_name }}</el-descriptions-item>
        <el-descriptions-item label="商品状况">{{ data.condition_type }}</el-descriptions-item>
        <el-descriptions-item label="站点">{{ data.marketplace }}</el-descriptions-item>
      </el-descriptions>

      <!-- 库存数量 -->
      <el-divider content-position="left">库存数量</el-divider>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="可售数量">
          <el-tag type="success">{{ data.available_quantity }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="预留转移">{{ data.reserved_fc_transfer }}</el-descriptions-item>
        <el-descriptions-item label="预留处理中">{{ data.reserved_fc_processing }}</el-descriptions-item>
        <el-descriptions-item label="预留买家订单">{{ data.reserved_customer_order }}</el-descriptions-item>
        <el-descriptions-item label="总预留数量">{{ data.total_reserved_quantity }}</el-descriptions-item>
        <el-descriptions-item label="入库数量">{{ data.inbound_quantity }}</el-descriptions-item>
        <el-descriptions-item label="入库处理中">{{ data.inbound_working }}</el-descriptions-item>
        <el-descriptions-item label="已发货在途">{{ data.shipped_quantity }}</el-descriptions-item>
        <el-descriptions-item label="已接收数量">{{ data.inbound_received || data.received_quantity }}</el-descriptions-item>
        <el-descriptions-item label="不可售数量">{{ data.unavailable_quantity }}</el-descriptions-item>
        <el-descriptions-item label="无法配送数量">{{ data.unfulfillable_quantity }}</el-descriptions-item>
        <el-descriptions-item label="待删除数量">{{ data.pending_removal_quantity }}</el-descriptions-item>
      </el-descriptions>

      <!-- 销售信息 -->
      <el-divider content-position="left">销售信息</el-divider>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="单价(¥)">{{ formatCurrency(data.your_price) }}</el-descriptions-item>
        <el-descriptions-item label="售出件数(30天)">{{ data.sales_last_30_days }}</el-descriptions-item>
        <el-descriptions-item label="售出金额(¥)">{{ formatCurrency(data.sales_amount) }}</el-descriptions-item>
        <el-descriptions-item label="7天销量">{{ data.sales_last_7_days || data.units_shipped_t7 }}</el-descriptions-item>
        <el-descriptions-item label="30天销量">{{ data.sales_last_30_days || data.units_shipped_t30 }}</el-descriptions-item>
        <el-descriptions-item label="60天销量">{{ data.sales_shipped_last_60_days || data.units_shipped_t60 }}</el-descriptions-item>
        <el-descriptions-item label="90天销量">{{ data.sales_shipped_last_90_days || data.units_shipped_t90 }}</el-descriptions-item>
        <el-descriptions-item label="销售排名">{{ data.sales_rank }}</el-descriptions-item>
        <el-descriptions-item label="售出率">{{ data.sell_through }}</el-descriptions-item>
      </el-descriptions>

      <!-- 价格信息 -->
      <el-divider content-position="left">价格信息</el-divider>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="您的价格">{{ formatCurrency(data.your_price) }}</el-descriptions-item>
        <el-descriptions-item label="销售价格">{{ formatCurrency(data.sales_price) }}</el-descriptions-item>
        <el-descriptions-item label="特色优惠价">{{ formatCurrency(data.featuredoffer_price) }}</el-descriptions-item>
        <el-descriptions-item label="全新最低价(含运费)">{{ formatCurrency(data.lowest_price_new_plus_shipping) }}</el-descriptions-item>
        <el-descriptions-item label="二手最低价">{{ formatCurrency(data.lowest_price_used) }}</el-descriptions-item>
        <el-descriptions-item label="建议销售价格">{{ formatCurrency(data.recommended_sales_price) }}</el-descriptions-item>
      </el-descriptions>

      <!-- 库龄信息 -->
      <el-divider content-position="left">库龄信息</el-divider>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="可供天数">{{ data.days_of_supply }}</el-descriptions-item>
        <el-descriptions-item label="历史可供天数">{{ data.historical_days_of_supply }}</el-descriptions-item>
        <el-descriptions-item label="含在途总可供天数">{{ data.total_days_supply_open_shipments }}</el-descriptions-item>
        <el-descriptions-item label="0-30天">{{ data.inv_age_0_to_30_days }}</el-descriptions-item>
        <el-descriptions-item label="31-60天">{{ data.inv_age_31_to_60_days }}</el-descriptions-item>
        <el-descriptions-item label="61-90天">{{ data.inv_age_61_to_90_days }}</el-descriptions-item>
        <el-descriptions-item label="91-180天">{{ data.inv_age_91_to_180_days }}</el-descriptions-item>
        <el-descriptions-item label="181-270天">{{ data.inv_age_181_to_270_days }}</el-descriptions-item>
        <el-descriptions-item label="271-365天">{{ data.inv_age_271_to_365_days }}</el-descriptions-item>
        <el-descriptions-item label="366-455天">{{ data.inv_age_366_to_455_days }}</el-descriptions-item>
        <el-descriptions-item label="456天以上">{{ data.inv_age_456_plus_days }}</el-descriptions-item>
        <el-descriptions-item label="库龄快照日期">{{ data.inventory_age_snapshot_date }}</el-descriptions-item>
      </el-descriptions>

      <!-- 库存健康状态 -->
      <el-divider content-position="left">库存健康状态</el-divider>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="预警状态">{{ data.alert }}</el-descriptions-item>
        <el-descriptions-item label="FBA库存健康状态">{{ data.fba_inventory_level_health_status }}</el-descriptions-item>
        <el-descriptions-item label="建议操作">{{ data.recommended_action }}</el-descriptions-item>
        <el-descriptions-item label="建议补货量">{{ data.recommended_ship_in_quantity }}</el-descriptions-item>
        <el-descriptions-item label="建议发货日期">{{ data.recommended_ship_in_date }}</el-descriptions-item>
        <el-descriptions-item label="预计过剩数量">{{ data.estimated_excess_quantity }}</el-descriptions-item>
        <el-descriptions-item label="30天覆盖周数">{{ data.weeks_of_cover_t30 }}</el-descriptions-item>
        <el-descriptions-item label="90天覆盖周数">{{ data.weeks_of_cover_t90 }}</el-descriptions-item>
        <el-descriptions-item label="6个月无销售">{{ data.no_sale_last_6_months ? '是' : '否' }}</el-descriptions-item>
        <el-descriptions-item label="豁免低库存费">{{ data.exempted_low_inventory_fee ? '是' : '否' }}</el-descriptions-item>
      </el-descriptions>

      <!-- AIS 库存仓储费 -->
      <el-divider content-position="left">AIS 库存仓储费</el-divider>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="181-210天数量">{{ data.quantity_ais_181_210_days }}</el-descriptions-item>
        <el-descriptions-item label="181-210天估算">{{ formatCurrency(data.estimated_ais_181_210_days) }}</el-descriptions-item>
        <el-descriptions-item label="211-240天数量">{{ data.quantity_ais_211_240_days }}</el-descriptions-item>
        <el-descriptions-item label="211-240天估算">{{ formatCurrency(data.estimated_ais_211_240_days) }}</el-descriptions-item>
        <el-descriptions-item label="241-270天数量">{{ data.quantity_ais_241_270_days }}</el-descriptions-item>
        <el-descriptions-item label="241-270天估算">{{ formatCurrency(data.estimated_ais_241_270_days) }}</el-descriptions-item>
        <el-descriptions-item label="271-300天数量">{{ data.quantity_ais_271_300_days }}</el-descriptions-item>
        <el-descriptions-item label="271-300天估算">{{ formatCurrency(data.estimated_ais_271_300_days) }}</el-descriptions-item>
        <el-descriptions-item label="301-330天数量">{{ data.quantity_ais_301_330_days }}</el-descriptions-item>
        <el-descriptions-item label="301-330天估算">{{ formatCurrency(data.estimated_ais_301_330_days) }}</el-descriptions-item>
        <el-descriptions-item label="331-365天数量">{{ data.quantity_ais_331_365_days }}</el-descriptions-item>
        <el-descriptions-item label="331-365天估算">{{ formatCurrency(data.estimated_ais_331_365_days) }}</el-descriptions-item>
        <el-descriptions-item label="366-455天数量">{{ data.quantity_ais_366_455_days }}</el-descriptions-item>
        <el-descriptions-item label="366-455天估算">{{ formatCurrency(data.estimated_ais_366_455_days) }}</el-descriptions-item>
        <el-descriptions-item label="456+天数量">{{ data.quantity_ais_456_plus_days }}</el-descriptions-item>
        <el-descriptions-item label="456+天估算">{{ formatCurrency(data.estimated_ais_456_plus_days) }}</el-descriptions-item>
      </el-descriptions>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="下月预计仓储费">{{ formatCurrency(data.estimated_storage_cost_next_month) }}</el-descriptions-item>
        <el-descriptions-item label="FBA最低库存水平">{{ data.fba_minimum_inventory_level }}</el-descriptions-item>
      </el-descriptions>

      <!-- 仓储信息 -->
      <el-divider content-position="left">仓储信息</el-divider>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="存储类型">{{ data.storage_type }}</el-descriptions-item>
        <el-descriptions-item label="存储体积">{{ data.storage_volume }} {{ data.volume_unit_measurement }}</el-descriptions-item>
        <el-descriptions-item label="商品体积">{{ data.item_volume }} {{ data.volume_unit_measurement }}</el-descriptions-item>
        <el-descriptions-item label="货币">{{ data.currency }}</el-descriptions-item>
        <el-descriptions-item label="产品组">{{ data.product_group }}</el-descriptions-item>
        <el-descriptions-item label="供应商">{{ data.supplier }}</el-descriptions-item>
      </el-descriptions>

      <!-- 季节性信息 -->
      <el-divider content-position="left">季节性信息</el-divider>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="未来3个月季节性">{{ data.is_seasonal_next_3_months ? '是' : '否' }}</el-descriptions-item>
        <el-descriptions-item label="季节名称">{{ data.season_name }}</el-descriptions-item>
        <el-descriptions-item label="季节开始日期">{{ data.season_start_date }}</el-descriptions-item>
        <el-descriptions-item label="季节结束日期">{{ data.season_end_date }}</el-descriptions-item>
      </el-descriptions>

      <!-- 其他信息 -->
      <el-divider content-position="left">其他信息</el-divider>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="快照日期">{{ data.snapshot_date }}</el-descriptions-item>
        <el-descriptions-item label="历史天数最后更新">{{ data.last_updated_historical_days }}</el-descriptions-item>
        <el-descriptions-item label="短期历史可供天数">{{ data.short_term_historical_days }}</el-descriptions-item>
        <el-descriptions-item label="长期历史可供天数">{{ data.long_term_historical_days }}</el-descriptions-item>
        <el-descriptions-item label="FBA现有库存">{{ data.inventory_supply_at_fba }}</el-descriptions-item>
        <el-descriptions-item label="上传批次">{{ data.upload_batch }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'

const dialogVisible = ref(false)
const data = ref(null)

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === '') return '-'
  return parseFloat(value).toFixed(2)
}

const open = (rowData) => {
  data.value = rowData
  dialogVisible.value = true
}

defineExpose({ open })
</script>

<style scoped>
.detail-container {
  max-height: 70vh;
  overflow-y: auto;
}

.el-divider {
  margin: 16px 0 12px;
}
</style>
