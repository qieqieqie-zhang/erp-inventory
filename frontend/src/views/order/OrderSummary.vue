<template>
  <div class="order-summary-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>订单销量汇总</h2>
      <div class="header-actions">
        <el-button type="primary" :icon="Download" @click="exportSummary">
          导出汇总报告
        </el-button>
        <el-button :icon="Refresh" @click="refreshData">
          刷新数据
        </el-button>
      </div>
    </div>

    <!-- 时间维度选择 -->
    <el-card shadow="never" class="dimension-card">
      <div class="dimension-container">
        <div class="dimension-tabs">
          <el-radio-group v-model="activeDimension" @change="handleDimensionChange">
            <el-radio-button label="yesterday">昨日</el-radio-button>
            <el-radio-button label="3days">近3天</el-radio-button>
            <el-radio-button label="7days">近7天</el-radio-button>
            <el-radio-button label="14days">近14天</el-radio-button>
            <el-radio-button label="30days">近30天</el-radio-button>
          </el-radio-group>
        </div>
        
        <div class="date-range">
          <el-date-picker
            v-model="selectedDateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            @change="handleDateRangeChange"
          />
        </div>
      </div>
    </el-card>

    <!-- 汇总统计 -->
    <div class="summary-stats">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="never" class="summary-card total-orders">
            <div class="summary-item">
              <div class="summary-icon">
                <el-icon><ShoppingCart /></el-icon>
              </div>
              <div class="summary-content">
                <div class="summary-value">{{ summaryData.totalOrders || 0 }}</div>
                <div class="summary-label">订单总数</div>
                <div class="summary-change" :class="getChangeClass(summaryData.ordersChange)">
                  <el-icon v-if="summaryData.ordersChange > 0"><Top /></el-icon>
                  <el-icon v-else-if="summaryData.ordersChange < 0"><Bottom /></el-icon>
                  {{ formatPercentage(summaryData.ordersChange) }}
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card shadow="never" class="summary-card total-revenue">
            <div class="summary-item">
              <div class="summary-icon">
                <el-icon><Money /></el-icon>
              </div>
              <div class="summary-content">
                <div class="summary-value">¥{{ formatCurrency(summaryData.totalRevenue || 0) }}</div>
                <div class="summary-label">销售总额</div>
                <div class="summary-change" :class="getChangeClass(summaryData.revenueChange)">
                  <el-icon v-if="summaryData.revenueChange > 0"><Top /></el-icon>
                  <el-icon v-else-if="summaryData.revenueChange < 0"><Bottom /></el-icon>
                  {{ formatPercentage(summaryData.revenueChange) }}
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card shadow="never" class="summary-card total-units">
            <div class="summary-item">
              <div class="summary-icon">
                <el-icon><Box /></el-icon>
              </div>
              <div class="summary-content">
                <div class="summary-value">{{ summaryData.totalUnits || 0 }}</div>
                <div class="summary-label">销售数量</div>
                <div class="summary-change" :class="getChangeClass(summaryData.unitsChange)">
                  <el-icon v-if="summaryData.unitsChange > 0"><Top /></el-icon>
                  <el-icon v-else-if="summaryData.unitsChange < 0"><Bottom /></el-icon>
                  {{ formatPercentage(summaryData.unitsChange) }}
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card shadow="never" class="summary-card avg-order-value">
            <div class="summary-item">
              <div class="summary-icon">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="summary-content">
                <div class="summary-value">¥{{ formatCurrency(summaryData.avgOrderValue || 0) }}</div>
                <div class="summary-label">客单价</div>
                <div class="summary-change" :class="getChangeClass(summaryData.aovChange)">
                  <el-icon v-if="summaryData.aovChange > 0"><Top /></el-icon>
                  <el-icon v-else-if="summaryData.aovChange < 0"><Bottom /></el-icon>
                  {{ formatPercentage(summaryData.aovChange) }}
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <div class="chart-header">
              <span>销售额趋势</span>
              <el-select v-model="trendChartType" size="small" style="width: 120px;">
                <el-option label="折线图" value="line" />
                <el-option label="柱状图" value="bar" />
              </el-select>
            </div>
          </template>
          <div ref="revenueChartRef" class="chart-container" style="height: 300px;"></div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <div class="chart-header">
              <span>订单量分布</span>
              <el-select v-model="distributionChartType" size="small" style="width: 120px;">
                <el-option label="柱状图" value="bar" />
                <el-option label="饼图" value="pie" />
              </el-select>
            </div>
          </template>
          <div ref="distributionChartRef" class="chart-container" style="height: 300px;"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 站点排名 -->
    <el-card shadow="never" class="ranking-card">
      <template #header>
        <div class="ranking-header">
          <span>站点销售排名</span>
          <el-radio-group v-model="rankingType" size="small">
            <el-radio-button label="revenue">销售额</el-radio-button>
            <el-radio-button label="orders">订单量</el-radio-button>
            <el-radio-button label="units">销售数量</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <el-table :data="siteRanking" style="width: 100%;" stripe>
        <el-table-column prop="rank" label="排名" width="80" align="center">
          <template #default="{ row }">
            <div :class="['rank-badge', getRankClass(row.rank)]">
              {{ row.rank }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="marketplace" label="站点" width="120" />
        <el-table-column prop="country" label="国家" width="100" />
        <el-table-column prop="revenue" label="销售额" align="right">
          <template #default="{ row }">
            ¥{{ formatCurrency(row.revenue) }}
          </template>
        </el-table-column>
        <el-table-column prop="orders" label="订单数" width="100" align="center" />
        <el-table-column prop="units" label="销售数量" width="100" align="center" />
        <el-table-column prop="growth" label="增长率" width="120" align="center">
          <template #default="{ row }">
            <span :class="getGrowthClass(row.growth)">
              {{ formatPercentage(row.growth) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="marketShare" label="市场份额" width="120" align="center">
          <template #default="{ row }">
            {{ row.marketShare }}%
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 热销商品 -->
    <el-card shadow="never" class="products-card">
      <template #header>
        <span>热销商品Top 10</span>
      </template>
      <el-table :data="topProducts" style="width: 100%;" stripe>
        <el-table-column prop="rank" label="排名" width="80" align="center">
          <template #default="{ row }">
            <div :class="['product-rank', getProductRankClass(row.rank)]">
              {{ row.rank }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="sku" label="SKU" width="120" />
        <el-table-column prop="product_name" label="商品名称" show-overflow-tooltip />
        <el-table-column prop="category" label="类目" width="120" />
        <el-table-column prop="revenue" label="销售额" width="120" align="right">
          <template #default="{ row }">
            ¥{{ formatCurrency(row.revenue) }}
          </template>
        </el-table-column>
        <el-table-column prop="units" label="销售数量" width="120" align="center" />
        <el-table-column prop="unit_price" label="平均单价" width="120" align="right">
          <template #default="{ row }">
            ¥{{ formatCurrency(row.unit_price) }}
          </template>
        </el-table-column>
        <el-table-column prop="growth" label="增长趋势" width="120" align="center">
          <template #default="{ row }">
            <el-progress
              :percentage="Math.min(Math.abs(row.growth) * 100, 100)"
              :status="getProgressStatus(row.growth)"
              :show-text="false"
            />
            <span :class="getGrowthClass(row.growth)" style="font-size: 12px;">
              {{ formatPercentage(row.growth) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="text" size="small" @click="viewProductDetail(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import {
  Download,
  Refresh,
  ShoppingCart,
  Money,
  Box,
  TrendCharts,
  Top,
  Bottom
} from '@element-plus/icons-vue'
import { apiService } from '../../utils/api'

// 图表实例
let revenueChart = null
let distributionChart = null

// 数据状态
const loading = ref(false)
const activeDimension = ref('7days')
const selectedDateRange = ref([])

// 汇总数据
const summaryData = ref({
  totalOrders: 0,
  totalRevenue: 0,
  totalUnits: 0,
  avgOrderValue: 0,
  ordersChange: 0,
  revenueChange: 0,
  unitsChange: 0,
  aovChange: 0
})

// 图表配置
const trendChartType = ref('line')
const distributionChartType = ref('bar')
const rankingType = ref('revenue')

// 站点排名数据
const siteRanking = ref([])

// 热销商品数据
const topProducts = ref([])

// 图表DOM引用
const revenueChartRef = ref(null)
const distributionChartRef = ref(null)

// 初始化加载数据
onMounted(() => {
  fetchSummaryData()
  initCharts()
})

onUnmounted(() => {
  if (revenueChart) {
    revenueChart.dispose()
  }
  if (distributionChart) {
    distributionChart.dispose()
  }
})

// 获取汇总数据
const fetchSummaryData = async () => {
  loading.value = true
  try {
    const params = {
      dimension: activeDimension.value,
      startDate: selectedDateRange.value[0],
      endDate: selectedDateRange.value[1]
    }

    const [summaryDataResult, orderListData] = await Promise.all([
      apiService.orders.getSummary(params),
      apiService.orders.getList(activeDimension.value, { page: 1, pageSize: 1000 })
    ])

    summaryData.value = summaryDataResult || {}

    // 从订单列表中提取站点统计
    if (orderListData?.list) {
      const siteMap = {}
      orderListData.list.forEach(order => {
        const site = order.marketplace || order.site || 'Other'
        if (!siteMap[site]) {
          siteMap[site] = { marketplace: site, revenue: 0, orders: 0, units: 0 }
        }
        siteMap[site].revenue += order.total_amount || 0
        siteMap[site].orders += 1
        siteMap[site].units += order.quantity || 0
      })

      siteRanking.value = Object.values(siteMap)
        .map((item, index) => ({
          ...item,
          rank: index + 1,
          growth: 0,
          marketShare: 0
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      // 热销商品TOP10
      const productMap = {}
      orderListData.list.forEach(order => {
        const sku = order.seller_sku || order.sku
        if (!productMap[sku]) {
          productMap[sku] = {
            sku,
            product_name: order.item_name || sku,
            revenue: 0,
            units: 0,
            unit_price: order.unit_price || 0
          }
        }
        productMap[sku].revenue += order.total_amount || 0
        productMap[sku].units += order.quantity || 0
      })

      topProducts.value = Object.values(productMap)
        .map((item, index) => ({
          ...item,
          rank: index + 1,
          growth: 0
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
    }

    // 更新图表数据
    updateCharts()
  } catch (error) {
    ElMessage.error(error.message || '获取汇总数据失败')
  } finally {
    loading.value = false
  }
}

// 初始化图表
const initCharts = () => {
  nextTick(() => {
    if (revenueChartRef.value) {
      revenueChart = echarts.init(revenueChartRef.value)
    }
    if (distributionChartRef.value) {
      distributionChart = echarts.init(distributionChartRef.value)
    }
    updateCharts()
  })
}

// 更新图表数据
const updateCharts = () => {
  // 销售额趋势图
  if (revenueChart) {
    const option = {
      tooltip: {
        trigger: 'axis',
        formatter: '{b}<br />¥{c}'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月'],
        axisLabel: {
          color: '#606266'
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: '¥{value}',
          color: '#606266'
        }
      },
      series: [
        {
          name: '销售额',
          type: trendChartType.value,
          data: [120000, 138000, 155000, 178000, 192000, 215000, 238000],
          itemStyle: {
            color: '#409EFF'
          },
          areaStyle: trendChartType.value === 'line' ? {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
              { offset: 1, color: 'rgba(64, 158, 255, 0.1)' }
            ])
          } : null
        }
      ]
    }
    revenueChart.setOption(option)
  }

  // 订单分布图
  if (distributionChart) {
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        top: 'center',
        itemWidth: 12,
        itemHeight: 12,
        textStyle: {
          fontSize: 12
        }
      },
      series: [
        {
          name: '订单分布',
          type: distributionChartType.value === 'pie' ? 'pie' : 'bar',
          radius: distributionChartType.value === 'pie' ? ['40%', '70%'] : null,
          data: [
            { value: 35, name: '美国站' },
            { value: 20, name: '英国站' },
            { value: 18, name: '德国站' },
            { value: 11, name: '日本站' },
            { value: 8, name: '加拿大站' },
            { value: 6, name: '法国站' },
            { value: 3, name: '意大利站' }
          ],
          itemStyle: {
            borderRadius: distributionChartType.value === 'bar' ? 4 : 0,
            color: function(params) {
              const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#A0A0FF', '#FFA0A0']
              return colors[params.dataIndex % colors.length]
            }
          },
          label: {
            show: distributionChartType.value === 'pie',
            formatter: '{b}: {d}%'
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    }
    
    if (distributionChartType.value === 'bar') {
      option.xAxis = {
        type: 'category',
        data: ['美国站', '英国站', '德国站', '日本站', '加拿大站', '法国站', '意大利站'],
        axisLabel: {
          color: '#606266'
        }
      }
      option.yAxis = {
        type: 'value',
        axisLabel: {
          formatter: '{value}%',
          color: '#606266'
        }
      }
      option.series[0].type = 'bar'
    }
    
    distributionChart.setOption(option)
  }
}

// 监听图表类型变化
const watchChartType = () => {
  updateCharts()
}

// 处理维度变化
const handleDimensionChange = () => {
  fetchSummaryData()
}

// 处理日期范围变化
const handleDateRangeChange = (dates) => {
  if (dates && dates.length === 2) {
    fetchSummaryData()
  }
}

// 刷新数据
const refreshData = () => {
  fetchSummaryData()
}

// 导出汇总报告
const exportSummary = async () => {
  try {
    loading.value = true
    // 这里调用导出接口
    // const blob = await apiService.orders.exportSummary(...)
    // 创建下载链接
    const data = JSON.stringify({
      summary: summaryData.value,
      dateRange: selectedDateRange.value,
      dimension: activeDimension.value
    }, null, 2)
    
    const blob = new Blob([data], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `订单汇总报告_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error(error.message || '导出失败')
  } finally {
    loading.value = false
  }
}

// 查看商品详情
const viewProductDetail = (row) => {
  // 跳转到商品详情页
  // router.push(`/products/detail/${row.sku}`)
  ElMessage.info('商品详情功能开发中')
}

// 工具方法
const formatCurrency = (value) => {
  if (value === undefined || value === null) return '0.00'
  return parseFloat(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const formatPercentage = (value) => {
  if (value === undefined || value === null) return '0.00%'
  return `${(value * 100).toFixed(2)}%`
}

const getChangeClass = (change) => {
  if (change > 0) return 'positive-change'
  if (change < 0) return 'negative-change'
  return 'neutral-change'
}

const getRankClass = (rank) => {
  if (rank <= 3) return 'rank-top'
  if (rank <= 6) return 'rank-middle'
  return 'rank-bottom'
}

const getProductRankClass = (rank) => {
  if (rank <= 3) return 'rank-gold'
  if (rank <= 6) return 'rank-silver'
  return 'rank-bronze'
}

const getGrowthClass = (growth) => {
  if (growth > 0) return 'positive-growth'
  if (growth < 0) return 'negative-growth'
  return 'neutral-growth'
}

const getProgressStatus = (growth) => {
  if (growth > 0) return 'success'
  if (growth < 0) return 'exception'
  return ''
}

// 监听图表类型变化
watch(trendChartType, updateCharts)
watch(distributionChartType, updateCharts)
watch(rankingType, fetchSummaryData)
</script>

<style scoped>
.order-summary-container {
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
  color: #303133;
  font-size: 24px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.dimension-card {
  margin-bottom: 20px;
}

.dimension-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
}

.dimension-tabs {
  flex: 1;
}

.date-range {
  margin-left: 20px;
}

.summary-stats {
  margin-bottom: 20px;
}

.summary-card {
  border-radius: 8px;
  border: none;
}

.summary-card.total-orders .summary-icon {
  background-color: #409EFF;
}

.summary-card.total-revenue .summary-icon {
  background-color: #67C23A;
}

.summary-card.total-units .summary-icon {
  background-color: #E6A23C;
}

.summary-card.avg-order-value .summary-icon {
  background-color: #F56C6C;
}

.summary-item {
  display: flex;
  align-items: center;
  padding: 20px;
}

.summary-icon {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  color: white;
  font-size: 24px;
}

.summary-content {
  flex: 1;
}

.summary-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  line-height: 1.2;
  margin-bottom: 4px;
}

.summary-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.summary-change {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.summary-change.positive-change {
  color: #67C23A;
}

.summary-change.negative-change {
  color: #F56C6C;
}

.summary-change.neutral-change {
  color: #909399;
}

.chart-row {
  margin-bottom: 20px;
}

.chart-card {
  border-radius: 8px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  width: 100%;
}

.ranking-card,
.products-card {
  margin-bottom: 20px;
  border-radius: 8px;
}

.ranking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rank-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin: 0 auto;
}

.rank-badge.rank-top {
  background-color: #FEF0F0;
  color: #F56C6C;
}

.rank-badge.rank-middle {
  background-color: #FFF6EC;
  color: #E6A23C;
}

.rank-badge.rank-bottom {
  background-color: #F4F4F5;
  color: #909399;
}

.product-rank {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin: 0 auto;
}

.product-rank.rank-gold {
  background-color: #FFF2D8;
  color: #E6A23C;
  border: 2px solid #E6A23C;
}

.product-rank.rank-silver {
  background-color: #F5F5F5;
  color: #909399;
  border: 2px solid #909399;
}

.product-rank.rank-bronze {
  background-color: #FEF0F0;
  color: #F56C6C;
  border: 2px solid #F56C6C;
}

.positive-growth {
  color: #67C23A;
}

.negative-growth {
  color: #F56C6C;
}

.neutral-growth {
  color: #909399;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .dimension-container {
    flex-direction: column;
    gap: 16px;
  }
  
  .date-range {
    margin-left: 0;
    width: 100%;
  }
  
  .chart-row .el-col {
    margin-bottom: 20px;
  }
  
  .ranking-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .summary-item {
    flex-direction: column;
    text-align: center;
    padding: 16px;
  }
  
  .summary-icon {
    margin-right: 0;
    margin-bottom: 12px;
  }
}
</style>