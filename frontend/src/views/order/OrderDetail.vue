<template>
  <div class="order-detail-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="Back" @click="$router.back()">返回</el-button>
        <h2 class="page-title">订单详情: {{ order.order_id || '加载中...' }}</h2>
      </div>
      <div class="header-right">
        <el-tag :type="getStatusType(order.order_status)" size="large" effect="dark">
          {{ getStatusText(order.order_status) }}
        </el-tag>
      </div>
    </div>

    <el-skeleton :loading="loading" animated>
      <template #template>
        <el-row :gutter="20">
          <el-col :span="16">
            <el-skeleton-item variant="p" style="height: 400px; margin-bottom: 20px;" />
            <el-skeleton-item variant="p" style="height: 300px;" />
          </el-col>
          <el-col :span="8">
            <el-skeleton-item variant="p" style="height: 200px; margin-bottom: 20px;" />
            <el-skeleton-item variant="p" style="height: 500px;" />
          </el-col>
        </el-row>
      </template>

      <template #default>
        <el-row :gutter="20">
          <!-- 左侧主要信息 -->
          <el-col :span="16">
            <!-- 核心订单信息 -->
            <el-card shadow="never" class="info-card">
              <template #header>
                <div class="card-header">
                  <span class="card-title">核心信息 / Core Information</span>
                </div>
              </template>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="亚马逊订单号 / Amazon Order ID">
                  <span class="highlight">{{ order.order_id }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="商家订单号 / Merchant Order ID">
                  {{ order.merchant_order_id || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="下单时间 / Purchase Date">
                  {{ formatDateTime(order.purchase_date) }}
                </el-descriptions-item>
                <el-descriptions-item label="最后更新 / Last Updated">
                  {{ formatDateTime(order.last_updated_date) }}
                </el-descriptions-item>
                <el-descriptions-item label="订单状态 / Order Status">
                  <el-tag :type="getStatusType(order.order_status)" size="small">
                    {{ order.order_status }} ({{ getStatusText(order.order_status) }})
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="销售渠道 / Sales Channel">
                  {{ order.marketplace || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="配送渠道 / Fulfillment">
                  {{ order.fulfillment_channel || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="运输级别 / Ship Service">
                  {{ order.ship_service_level || '-' }}
                </el-descriptions-item>
              </el-descriptions>
            </el-card>

            <!-- 商品明细 -->
            <el-card shadow="never" class="info-card">
              <template #header>
                <div class="card-header">
                  <span class="card-title">商品明细 / Product Details</span>
                </div>
              </template>
              <div class="product-info-box">
                <div class="product-main">
                  <div class="product-name">{{ order.item_name }}</div>
                  <div class="product-meta">
                    <span class="meta-item"><strong>SKU:</strong> {{ order.seller_sku }}</span>
                    <span class="meta-item"><strong>ASIN:</strong> {{ order.asin }}</span>
                    <span class="meta-item"><strong>状态 / Status:</strong> {{ order.item_status || '-' }}</span>
                  </div>
                </div>
                <div class="price-table">
                  <el-descriptions :column="3" border>
                    <el-descriptions-item label="数量 / Qty">{{ order.quantity_purchased }}</el-descriptions-item>
                    <el-descriptions-item label="单价 / Unit Price">{{ formatCurrency(order.item_price, order.currency) }}</el-descriptions-item>
                    <el-descriptions-item label="商品税额 / Tax">{{ formatCurrency(order.item_tax, order.currency) }}</el-descriptions-item>
                    <el-descriptions-item label="运费 / Shipping">{{ formatCurrency(order.shipping_price, order.currency) }}</el-descriptions-item>
                    <el-descriptions-item label="运费税额 / Ship Tax">{{ formatCurrency(order.shipping_tax, order.currency) }}</el-descriptions-item>
                    <el-descriptions-item label="总金额 / Total">
                      <span class="total-price">{{ formatCurrency(order.total_amount, order.currency) }}</span>
                    </el-descriptions-item>
                  </el-descriptions>
                </div>
              </div>
            </el-card>

            <!-- 优惠与促销 -->
            <el-card shadow="never" class="info-card" v-if="hasPromotions">
              <template #header>
                <div class="card-header">
                  <span class="card-title">优惠与促销 / Promotions</span>
                </div>
              </template>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="商品折扣 / Item Discount">
                  {{ formatCurrency(order.item_promotion_discount, order.currency) }}
                </el-descriptions-item>
                <el-descriptions-item label="运费折扣 / Ship Discount">
                  {{ formatCurrency(order.ship_promotion_discount, order.currency) }}
                </el-descriptions-item>
                <el-descriptions-item label="促销 ID / Promotion IDs" :span="2">
                  {{ order.promotion_ids || '-' }}
                </el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-col>

          <!-- 右侧辅助信息 -->
          <el-col :span="8">
            <!-- 收货地址 -->
            <el-card shadow="never" class="info-card">
              <template #header>
                <div class="card-header">
                  <span class="card-title">收货信息 / Shipping</span>
                </div>
              </template>
              <div class="address-box">
                <div class="address-item">
                  <el-icon><User /></el-icon>
                  <span>{{ order.buyer_name || '未提供姓名' }}</span>
                </div>
                <div class="address-item" v-if="order.buyer_phone">
                  <el-icon><Phone /></el-icon>
                  <span>{{ order.buyer_phone }}</span>
                </div>
                <div class="address-detail">
                  <el-icon><Location /></el-icon>
                  <div>
                    <p>{{ order.ship_city }}, {{ order.ship_state }}</p>
                    <p>{{ order.ship_postal_code }}</p>
                    <p class="country-tag">{{ order.ship_country }}</p>
                  </div>
                </div>
              </div>
            </el-card>

            <!-- 其他属性 -->
            <el-card shadow="never" class="info-card">
              <template #header>
                <div class="card-header">
                  <span class="card-title">扩展属性 / Attributes</span>
                </div>
              </template>
              <el-descriptions :column="1" border>
                <el-descriptions-item label="企业订单 / Business">
                  <el-tag :type="order.is_business_order === 'true' ? 'success' : 'info'">
                    {{ order.is_business_order === 'true' ? '是 / Yes' : '否 / No' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="采购订单号 / PO Number">
                  {{ order.purchase_order_number || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="价格指定 / Designation">
                  {{ order.price_designation || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="数据批次 / Batch">
                  <span class="batch-code">{{ order.upload_batch }}</span>
                </el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-col>
        </el-row>
      </template>
    </el-skeleton>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Back, User, Phone, Location } from '@element-plus/icons-vue'
import { apiService } from '../../utils/api'

const route = useRoute()
const loading = ref(true)
const order = ref({})

// 是否有促销信息
const hasPromotions = computed(() => {
  return order.value.item_promotion_discount > 0 || 
         order.value.ship_promotion_discount > 0 || 
         order.value.promotion_ids
})

// 获取详情
const fetchOrderDetail = async () => {
  loading.value = true
  try {
    const id = route.params.id
    const data = await apiService.orders.getDetail(id)
    order.value = data || {}
  } catch (error) {
    ElMessage.error(error.message || '获取订单详情失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchOrderDetail()
})

// 工具方法
const formatCurrency = (value, currency = 'USD') => {
  if (value === undefined || value === null) return '-'
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: currency || 'USD'
  }).format(value)
}

const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const getStatusType = (status) => {
  const s = (status || '').toLowerCase()
  if (s.includes('shipped') || s.includes('complete')) return 'success'
  if (s.includes('pending')) return 'warning'
  if (s.includes('cancel')) return 'danger'
  return 'info'
}

const getStatusText = (status) => {
  const s = (status || '').toLowerCase()
  const map = {
    'shipped': '已发货',
    'unshipped': '未发货',
    'pending': '待处理',
    'cancelled': '已取消',
    'complete': '已完成'
  }
  return map[s] || status
}
</script>

<style scoped>
.order-detail-container {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.info-card {
  margin-bottom: 20px;
  border-radius: 8px;
  border: none;
}

.card-title {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
  position: relative;
  padding-left: 12px;
}

.card-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 16px;
  background-color: #409EFF;
  border-radius: 2px;
}

.highlight {
  font-weight: 600;
  color: #409EFF;
}

.product-info-box {
  padding: 8px;
}

.product-name {
  font-size: 15px;
  line-height: 1.6;
  color: #303133;
  margin-bottom: 12px;
  font-weight: 500;
}

.product-meta {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  font-size: 13px;
  color: #606266;
}

.meta-item strong {
  color: #909399;
  margin-right: 4px;
}

.total-price {
  font-size: 18px;
  font-weight: bold;
  color: #f56c6c;
}

.address-box {
  padding: 10px 0;
}

.address-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 15px;
  color: #303133;
}

.address-detail {
  display: flex;
  gap: 10px;
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
}

.address-detail p {
  margin: 0;
}

.country-tag {
  display: inline-block;
  margin-top: 8px !important;
  background: #f0f2f5;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  color: #303133;
}

.batch-code {
  font-family: monospace;
  font-size: 12px;
  color: #909399;
}

:deep(.el-descriptions__label) {
  width: 160px;
  background-color: #fafafa !important;
  font-weight: 500;
  color: #606266;
}

:deep(.el-descriptions__content) {
  color: #303133;
}
</style>
