<template>
  <div class="order-summary-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>订单销量汇总</h2>
      <div class="header-actions">
        <el-select v-model="selectedShopId" placeholder="选择店铺" clearable style="width: 180px; margin-right: 10px;">
          <el-option label="全部店铺" :value="null" />
          <el-option v-for="shop in shopList" :key="shop.id" :label="shop.shop_name" :value="shop.id" />
        </el-select>
        <el-button type="primary" :icon="Upload" @click="showUploadDialog">
          上传订单报告
        </el-button>
        <el-button type="danger" :icon="Delete" @click="handleClearAll">
          清空列表
        </el-button>
        <el-button :icon="Download" @click="exportData">
          导出报告
        </el-button>
        <el-button :icon="Refresh" @click="refreshData">
          刷新
        </el-button>
      </div>
    </div>

    <!-- 时间维度选择 -->
    <el-card shadow="never" class="dimension-card">
      <div class="dimension-container">
        <div class="dimension-tabs">
          <el-radio-group v-model="activeDimension" @change="handleDimensionChange">
            <el-radio-button label="all">全部</el-radio-button>
            <el-radio-button label="yesterday">昨日</el-radio-button>
            <el-radio-button label="3days">近3天</el-radio-button>
            <el-radio-button label="7days">近7天</el-radio-button>
            <el-radio-button label="14days">近14天</el-radio-button>
            <el-radio-button label="30days">近30天</el-radio-button>
          </el-radio-group>
        </div>

        <div class="date-range">
          <el-date-picker
            v-model="customDateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            :clearable="true"
            @change="handleCustomDateChange"
          />
          <el-button v-if="customDateRange" type="text" @click="clearCustomDate" style="margin-left: 8px;">
            清除自定义
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 数据覆盖范围提示 -->
    <div v-if="summaryData.data_coverage" class="data-coverage-tip">
      <el-icon><InfoFilled /></el-icon>
      <span v-if="summaryData.data_coverage.start_date && summaryData.data_coverage.end_date">
        当前订单数据覆盖范围：
        {{ formatDate(summaryData.data_coverage.start_date) }} 至 {{ formatDate(summaryData.data_coverage.end_date) }}
      </span>
      <span v-else>暂无上传的订单数据</span>
    </div>

    <!-- 汇总统计卡片 -->
    <div class="summary-stats">
      <el-row :gutter="20">
        <el-col :span="4">
          <el-card shadow="never" class="summary-card total-orders">
            <div class="summary-item">
              <div class="summary-icon">
                <el-icon><ShoppingCart /></el-icon>
              </div>
              <div class="summary-content">
                <div class="summary-value">{{ summaryData.order_count || 0 }}</div>
                <div class="summary-label">订单数</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="4">
          <el-card shadow="never" class="summary-card total-revenue">
            <div class="summary-item">
              <div class="summary-icon">
                <el-icon><Money /></el-icon>
              </div>
              <div class="summary-content">
                <div class="summary-value">
                  <template v-if="summaryData.is_multi_currency">
                    <span class="multi-currency-tip">多币种</span>
                  </template>
                  <template v-else>
                    {{ summaryData.currency_breakdown && summaryData.currency_breakdown[0]
                      ? formatCurrency(summaryData.currency_breakdown[0].net_sales_amount, summaryData.currency_breakdown[0].currency)
                      : '¥0.00' }}
                  </template>
                </div>
                <div class="summary-label">销售额</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="4">
          <el-card shadow="never" class="summary-card total-units">
            <div class="summary-item">
              <div class="summary-icon">
                <el-icon><Box /></el-icon>
              </div>
              <div class="summary-content">
                <div class="summary-value">{{ summaryData.units_sold || 0 }}</div>
                <div class="summary-label">销售数量</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="4">
          <el-card shadow="never" class="summary-card avg-order-value">
            <div class="summary-item">
              <div class="summary-icon">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="summary-content">
                <div class="summary-value">
                  <template v-if="summaryData.is_multi_currency">
                    <span class="multi-currency-tip">-</span>
                  </template>
                  <template v-else>
                    {{ formatCurrency(summaryData.avg_order_value || 0, summaryData.currency_breakdown?.[0]?.currency) }}
                  </template>
                </div>
                <div class="summary-label">客单价</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="4">
          <el-card shadow="never" class="summary-card pending-orders">
            <div class="summary-item">
              <div class="summary-icon">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="summary-content">
                <div class="summary-value">{{ summaryData.pending_order_count || 0 }}</div>
                <div class="summary-label">
                  待处理订单
                  <el-tooltip content="包含 Pending、Unshipped、Shipping 状态的订单" style="margin-left: 4px;">
                    <el-icon style="cursor: pointer; font-size: 12px;"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="4">
          <el-card shadow="never" class="summary-card effective-rate">
            <div class="summary-item">
              <div class="summary-icon">
                <el-icon><CircleCheck /></el-icon>
              </div>
              <div class="summary-content">
                <div class="summary-value">
                  {{ summaryData.effective_order_rate !== null ? formatPercent(summaryData.effective_order_rate) : '-' }}
                </div>
                <div class="summary-label">有效订单率</div>
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
          <div v-if="dailyTrendData.length > 0" ref="revenueChartRef" class="chart-container" style="height: 300px;"></div>
          <div v-else class="empty-chart">
            <el-empty description="暂无数据，请上传订单报告" :image-size="80" />
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <div class="chart-header">
              <span>销售渠道分布</span>
              <el-select v-model="distributionChartType" size="small" style="width: 120px;">
                <el-option label="柱状图" value="bar" />
                <el-option label="饼图" value="pie" />
              </el-select>
            </div>
          </template>
          <div v-if="channelDistributionData.length > 0" ref="distributionChartRef" class="chart-container" style="height: 300px;"></div>
          <div v-else class="empty-chart">
            <el-empty description="暂无数据" :image-size="80" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 热销商品 Top 10 -->
    <el-card shadow="never" class="products-card">
      <template #header>
        <div class="products-header">
          <span>热销商品 Top 10</span>
          <el-radio-group v-model="topSortBy" size="small" @change="handleTopSortChange">
            <el-radio-button label="units_sold">按销售数量</el-radio-button>
            <el-radio-button label="net_sales_amount">按销售额</el-radio-button>
            <el-radio-button label="order_count">按订单数</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <el-table v-if="topProductsData.length > 0" :data="topProductsData" style="width: 100%;" stripe>
        <el-table-column prop="rank" label="排名" width="60" align="center">
          <template #default="{ row }">
            <div :class="['product-rank', getProductRankClass(row.rank)]">
              {{ row.rank }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="sku" label="SKU" width="120" />
        <el-table-column prop="product_name" label="商品名称" show-overflow-tooltip />
        <el-table-column prop="order_count" label="订单数" width="80" align="center" />
        <el-table-column prop="units_sold" label="销售数量" width="100" align="center" />
        <el-table-column prop="net_sales_amount" label="销售额" width="120" align="right">
          <template #default="{ row }">
            {{ formatCurrency(row.net_sales_amount, 'USD') }}
          </template>
        </el-table-column>
        <el-table-column prop="last_order_time" label="最近订单" width="140" align="center">
          <template #default="{ row }">
            {{ row.last_order_time ? formatDate(row.last_order_time) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="trend_label" label="趋势" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.trend_label" :type="getTrendTagType(row.trend_type)" size="small">
              {{ row.trend_label }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button type="text" size="small" @click="viewSkuDetails(row.sku)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="暂无数据" :image-size="80" />
    </el-card>

    <!-- 补货辅助判断 -->
    <el-card shadow="never" class="replenishment-card">
      <template #header>
        <div class="replenishment-header">
          <span>补货辅助判断</span>
          <el-button type="text" @click="refreshReplenishment">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </div>
      </template>
      <el-row :gutter="20">
        <!-- 高需求SKU -->
        <el-col :span="8">
          <div class="replenishment-section">
            <div class="section-title">
              <el-icon color="#F56C6C"><Top /></el-icon>
              高需求SKU
              <el-tooltip content="按近7天销量排序，显示当前需求最旺的商品">
                <el-icon><QuestionFilled /></el-icon>
              </el-tooltip>
            </div>
            <div v-if="replenishmentData.highDemandSkus && replenishmentData.highDemandSkus.length > 0" class="sku-list">
              <div v-for="sku in replenishmentData.highDemandSkus" :key="sku.sku" class="sku-item" @click="viewSkuDetails(sku.sku)">
                <div class="sku-info">
                  <span class="sku-name">{{ sku.sku }}</span>
                  <el-tag v-if="sku.trend_label" :type="getTrendTagType(sku.trend_type)" size="small">
                    {{ sku.trend_label }}
                  </el-tag>
                </div>
                <div class="sku-sales">
                  <span>7天: {{ sku.sales_7days }}</span>
                  <span>日均: {{ sku.daily_avg_7days ? sku.daily_avg_7days.toFixed(1) : 0 }}</span>
                </div>
              </div>
            </div>
            <el-empty v-else description="暂无数据" :image-size="60" />
          </div>
        </el-col>

        <!-- 最近起量SKU -->
        <el-col :span="8">
          <div class="replenishment-section">
            <div class="section-title">
              <el-icon color="#67C23A"><Top /></el-icon>
              最近起量SKU
              <el-tooltip content="近3天日均销量相比近7天日均增长超过50%，显示需求正在爆发的商品">
                <el-icon><QuestionFilled /></el-icon>
              </el-tooltip>
            </div>
            <div v-if="replenishmentData.risingSkus && replenishmentData.risingSkus.length > 0" class="sku-list">
              <div v-for="sku in replenishmentData.risingSkus" :key="sku.sku" class="sku-item" @click="viewSkuDetails(sku.sku)">
                <div class="sku-info">
                  <span class="sku-name">{{ sku.sku }}</span>
                  <el-tag type="success" size="small">爆发</el-tag>
                </div>
                <div class="sku-sales">
                  <span>3天: {{ sku.sales_3days }}</span>
                  <span>7天: {{ sku.sales_7days }}</span>
                </div>
              </div>
            </div>
            <el-empty v-else description="暂无数据" :image-size="60" />
          </div>
        </el-col>

        <!-- 断单风险SKU -->
        <el-col :span="8">
          <div class="replenishment-section">
            <div class="section-title">
              <el-icon color="#E6A23C"><Warning /></el-icon>
              断单风险SKU
              <el-tooltip content="近7天有销量，但最近2天无订单，可能存在断货风险">
                <el-icon><QuestionFilled /></el-icon>
              </el-tooltip>
            </div>
            <div v-if="replenishmentData.stockOutRiskSkus && replenishmentData.stockOutRiskSkus.length > 0" class="sku-list">
              <div v-for="sku in replenishmentData.stockOutRiskSkus" :key="sku.sku" class="sku-item" @click="viewSkuDetails(sku.sku)">
                <div class="sku-info">
                  <span class="sku-name">{{ sku.sku }}</span>
                  <el-tag type="warning" size="small">断单风险</el-tag>
                </div>
                <div class="sku-sales">
                  <span>7天: {{ sku.sales_7days }}</span>
                  <span>最近: {{ sku.last_order_time ? formatDateShort(sku.last_order_time) : '-' }}</span>
                </div>
              </div>
            </div>
            <el-empty v-else description="暂无数据" :image-size="60" />
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- SKU 销量汇总表 -->
    <el-card shadow="never" class="sku-card">
      <template #header>
        <div class="sku-header">
          <span>SKU 销量汇总</span>
          <span class="sku-count">共 {{ skuTotal }} 个 SKU</span>
        </div>
      </template>
      <el-table v-if="skuListData.length > 0" :data="skuListData" style="width: 100%;" stripe v-loading="skuLoading">
        <el-table-column prop="sku" label="SKU" width="120" fixed />
        <el-table-column prop="product_name" label="商品名称" show-overflow-tooltip min-width="180" />
        <el-table-column prop="asin" label="ASIN" width="110" />
        <el-table-column label="近7天销量" width="100" align="center">
          <template #default="{ row }">
            <el-tooltip content="近7天销量，用于判断最近一周真实需求，是补货和广告调整最常用的需求指标">
              <span class="highlight-value">{{ row.sales_7days || 0 }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="近30天销量" width="100" align="center">
          <template #default="{ row }">
            <el-tooltip content="近30天销量，用于判断长期需求和库存规划">
              <span>{{ row.sales_30days || 0 }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="日均销量" width="90" align="center">
          <template #default="{ row }">
            <el-tooltip content="近7天日均销量，用于和FBA库存页联动，估算库存还能卖几天">
              <span>{{ row.daily_avg_7days ? row.daily_avg_7days.toFixed(1) : '0' }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="order_count" label="订单数" width="80" align="center" />
        <el-table-column prop="units_sold" label="销售数量" width="90" align="center" />
        <el-table-column prop="net_sales_amount" label="销售额" width="110" align="right">
          <template #default="{ row }">
            {{ formatCurrency(row.net_sales_amount, row.currency) }}
          </template>
        </el-table-column>
        <el-table-column label="待处理订单" width="100" align="center">
          <template #header>
            <span>待处理订单</span>
            <el-tooltip content="待处理订单：订单已经产生，但还没有完成最终发货。它代表有需求正在进入，但不等同于已完成销量。&#10;当前字段包含：Pending、Unshipped、Shipping。">
              <el-icon style="margin-left: 4px; cursor: pointer;"><QuestionFilled /></el-icon>
            </el-tooltip>
          </template>
          <template #default="{ row }">
            <span v-if="row.pending_units > 0" class="status-pending">{{ row.pending_units }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="最近订单时间" width="140" align="center">
          <template #default="{ row }">
            <el-tooltip content="用于判断该SKU最近是否还在持续出单">
              <span class="date-cell">{{ row.last_order_time ? formatDate(row.last_order_time) : '-' }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button type="text" size="small" @click="viewSkuDetails(row.sku)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="暂无数据" :image-size="80" />
      <!-- 分页 -->
      <div v-if="skuTotal > 0" class="pagination-container">
        <el-pagination
          v-model:current-page="skuPage"
          v-model:page-size="skuPageSize"
          :page-sizes="[50, 100, 200]"
          :total="skuTotal"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSkuPageSizeChange"
          @current-change="handleSkuPageChange"
        />
      </div>
    </el-card>

    <!-- 上传对话框 -->
    <UploadDialog
      v-model="uploadDialogVisible"
      title="上传订单报告"
      :accept="'.txt,.tsv,.csv,.xlsx'"
      :upload-fn="handleUploadFn"
      :show-shop-select="true"
      upload-template-text="下载订单模板"
      @success="handleUploadSuccess"
    />

    <!-- SKU 订单明细对话框 -->
    <el-dialog v-model="skuDetailDialogVisible" title="SKU 订单明细" width="1000px" :close-on-click-modal="false">
      <div v-if="skuDetailData.salesSummary" class="sku-sales-summary">
        <!-- 核心指标 -->
        <div class="detail-section-title">核心指标</div>
        <el-descriptions :column="4" size="small" border>
          <el-descriptions-item label="SKU" :span="1">{{ skuDetailData.sku }}</el-descriptions-item>
          <el-descriptions-item label="趋势" :span="1">
            <el-tag :type="getTrendTagType(skuDetailData.salesSummary.trend_type)" size="small">
              {{ skuDetailData.salesSummary.trend_label }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="日均销量" :span="1">
            {{ skuDetailData.salesSummary.daily_avg_7days ? skuDetailData.salesSummary.daily_avg_7days.toFixed(1) : 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="最近订单时间" :span="1">
            {{ skuDetailData.salesSummary.last_order_time ? formatDate(skuDetailData.salesSummary.last_order_time) : '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 销量明细 -->
        <div class="detail-section-title">销量明细</div>
        <el-descriptions :column="4" size="small" border>
          <el-descriptions-item label="近3天销量">
            {{ skuDetailData.salesSummary.sales_3days || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="近7天销量">
            {{ skuDetailData.salesSummary.sales_7days || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="近14天销量">
            {{ skuDetailData.salesSummary.sales_14days || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="近30天销量">
            {{ skuDetailData.salesSummary.sales_30days || 0 }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 辅助信息 -->
        <div class="detail-section-title">辅助信息</div>
        <el-descriptions :column="4" size="small" border>
          <el-descriptions-item label="销售渠道">
            {{ skuDetailData.salesChannel || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="币种">
            {{ skuDetailData.currency || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="平均售价">
            {{ skuDetailData.avgUnitPrice ? formatCurrency(skuDetailData.avgUnitPrice, skuDetailData.currency) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="已取消数量">
            {{ skuDetailData.cancelledUnits || 0 }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <el-tabs>
        <el-tab-pane label="近7天订单明细">
          <el-table :data="skuOrderDetails" style="width: 100%;" stripe max-height="300">
            <el-table-column prop="amazon_order_id" label="订单号" width="150" />
            <el-table-column prop="purchase_date" label="购买时间" width="160">
              <template #default="{ row }">
                {{ formatDate(row.purchase_date) }}
              </template>
            </el-table-column>
            <el-table-column prop="order_status" label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="getStatusTagType(row.order_status)" size="small">
                  {{ row.order_status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="sales_channel" label="销售渠道" width="120" />
            <el-table-column prop="quantity" label="数量" width="80" align="center" />
            <el-table-column prop="currency" label="币种" width="60" align="center" />
            <el-table-column prop="item_price" label="商品售价" width="100" align="right">
              <template #default="{ row }">
                {{ formatCurrency(row.item_price, row.currency) }}
              </template>
            </el-table-column>
            <el-table-column prop="item_promotion_discount" label="促销折扣" width="80" align="right">
              <template #default="{ row }">
                {{ row.item_promotion_discount > 0 ? '-' + formatCurrency(row.item_promotion_discount, row.currency) : '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="ship_country" label="国家" width="80" align="center" />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="近30天状态分布">
          <el-table :data="skuStatusDistribution" style="width: 100%;" stripe>
            <el-table-column prop="order_status" label="订单状态" width="120">
              <template #default="{ row }">
                <el-tag :type="getStatusTagType(row.order_status)" size="small">
                  {{ row.order_status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="order_count" label="订单数" width="120" align="center" />
            <el-table-column prop="total_quantity" label="总数量" width="120" align="center" />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="近30天渠道分布">
          <el-table :data="skuChannelDistribution" style="width: 100%;" stripe>
            <el-table-column prop="sales_channel" label="销售渠道" width="150" />
            <el-table-column prop="ship_country" label="国家" width="100" />
            <el-table-column prop="order_count" label="订单数" width="100" align="center" />
            <el-table-column prop="total_quantity" label="销售数量" width="100" align="center" />
            <el-table-column prop="net_sales" label="销售额" width="120" align="right">
              <template #default="{ row }">
                {{ formatCurrency(row.net_sales, 'USD') }}
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="skuDetailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import {
  Download,
  Delete,
  Refresh,
  ShoppingCart,
  Money,
  Box,
  TrendCharts,
  Upload,
  InfoFilled,
  Clock,
  CircleCheck,
  Top,
  Warning,
  QuestionFilled
} from '@element-plus/icons-vue'
import { apiService } from '../../utils/api'
import UploadDialog from '../../components/UploadDialog.vue'

// ============ 图表实例 ============
let revenueChart = null
let distributionChart = null

// ============ 数据状态 ============
const loading = ref(false)
const uploadDialogVisible = ref(false)
const skuDetailDialogVisible = ref(false)
const skuDetailLoading = ref(false)

// 时间维度
const activeDimension = ref('all')
const customDateRange = ref(null)

// 店铺列表
const shopList = ref([])
const selectedShopId = ref(null)

// 汇总数据
const summaryData = ref({})

// SKU 列表
const skuLoading = ref(false)
const skuListData = ref([])
const skuPage = ref(1)
const skuPageSize = ref(100)
const skuTotal = ref(0)

// SKU 详情
const skuDetailData = ref({})
const skuOrderDetails = ref([])
const skuStatusDistribution = ref([])
const skuChannelDistribution = ref([])

// 图表数据
const dailyTrendData = ref([])
const channelDistributionData = ref([])
const topProductsData = ref([])
const topSortBy = ref('units_sold')

// 补货数据
const replenishmentData = ref({
  highDemandSkus: [],
  risingSkus: [],
  stockOutRiskSkus: []
})

// 图表配置
const trendChartType = ref('line')
const distributionChartType = ref('bar')

// 图表 DOM 引用
const revenueChartRef = ref(null)
const distributionChartRef = ref(null)

// ============ 上传处理 ============
const handleUploadFn = (formData) => {
  if (selectedShopId.value) {
    formData.append('shop_id', selectedShopId.value)
  }
  return apiService.orders.upload(formData)
}

const handleUploadSuccess = () => {
  ElMessage.success('订单报告上传成功')
  uploadDialogVisible.value = false
  refreshData()
}

const showUploadDialog = () => {
  uploadDialogVisible.value = true
}

// ============ 数据获取 ============
const fetchShopList = async () => {
  try {
    const data = await apiService.shops.getList({ page: 1, pageSize: 100 })
    shopList.value = data.list || []
  } catch (error) {
    console.error('获取店铺列表失败:', error)
  }
}

const fetchSummaryData = async () => {
  loading.value = true
  try {
    const params = {
      dimension: activeDimension.value,
      shop_id: selectedShopId.value || ''
    }

    if (customDateRange.value && customDateRange.value.length === 2) {
      params.startDate = customDateRange.value[0]
      params.endDate = customDateRange.value[1]
    }

    const data = await apiService.orders.getSummary(params)
    summaryData.value = data || {}
  } catch (error) {
    ElMessage.error('获取汇总数据失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

const fetchSkuList = async () => {
  skuLoading.value = true
  try {
    const params = {
      dimension: activeDimension.value,
      shop_id: selectedShopId.value || '',
      page: skuPage.value,
      pageSize: skuPageSize.value
    }

    if (customDateRange.value && customDateRange.value.length === 2) {
      params.startDate = customDateRange.value[0]
      params.endDate = customDateRange.value[1]
    }

    const data = await apiService.orders.getSkuList(params)
    skuListData.value = data.list || []
    skuTotal.value = data.pagination?.total || 0
  } catch (error) {
    console.error('获取SKU列表失败:', error)
  } finally {
    skuLoading.value = false
  }
}

const fetchChartsData = async () => {
  try {
    const params = {
      dimension: activeDimension.value,
      shop_id: selectedShopId.value || '',
      sortBy: topSortBy.value
    }

    if (customDateRange.value && customDateRange.value.length === 2) {
      params.startDate = customDateRange.value[0]
      params.endDate = customDateRange.value[1]
    }

    const data = await apiService.orders.getChartsData(params)

    dailyTrendData.value = data.daily_trend || []
    channelDistributionData.value = data.channel_distribution || []
    topProductsData.value = data.top_products || []

    nextTick(() => {
      updateCharts()
    })
  } catch (error) {
    console.error('获取图表数据失败:', error)
  }
}

const fetchReplenishmentData = async () => {
  try {
    const params = {
      dimension: activeDimension.value,
      shop_id: selectedShopId.value || ''
    }

    if (customDateRange.value && customDateRange.value.length === 2) {
      params.startDate = customDateRange.value[0]
      params.endDate = customDateRange.value[1]
    }

    const data = await apiService.orders.getReplenishment(params)
    replenishmentData.value = data || { highDemandSkus: [], risingSkus: [], stockOutRiskSkus: [] }
  } catch (error) {
    console.error('获取补货数据失败:', error)
  }
}

const fetchSkuOrderDetails = async (sku) => {
  skuDetailLoading.value = true
  try {
    const params = {
      dimension: activeDimension.value,
      shop_id: selectedShopId.value || ''
    }

    if (customDateRange.value && customDateRange.value.length === 2) {
      params.startDate = customDateRange.value[0]
      params.endDate = customDateRange.value[1]
    }

    const data = await apiService.orders.getSkuDetails(sku, params)
    // 设置详情数据
    skuDetailData.value = {
      sku: data.sku,
      product_name: data.product_name,
      trend_label: data.trend?.label,
      trend_type: data.trend?.type,
      salesSummary: data.salesSummary || {},
      salesChannel: data.salesChannel || (data.channelDistribution?.[0]?.sales_channel || '-'),
      currency: data.currency || (data.channelDistribution?.[0]?.currency || '-'),
      avgUnitPrice: data.avgUnitPrice || (data.salesSummary?.net_sales_amount && data.salesSummary?.units_sold ? data.salesSummary.net_sales_amount / data.salesSummary.units_sold : 0),
      cancelledUnits: data.cancelledUnits || 0
    }
    skuOrderDetails.value = data.recent7daysOrders || []
    skuStatusDistribution.value = data.statusDistribution || []
    skuChannelDistribution.value = data.channelDistribution || []
  } catch (error) {
    ElMessage.error('获取订单明细失败')
    console.error(error)
  } finally {
    skuDetailLoading.value = false
  }
}

// ============ 图表 ============
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

const updateCharts = () => {
  updateRevenueChart()
  updateDistributionChart()
}

const updateRevenueChart = () => {
  if (!revenueChart || dailyTrendData.value.length === 0) return

  const dateMap = {}
  dailyTrendData.value.forEach(item => {
    const date = item.date instanceof Date
      ? item.date.toISOString().split('T')[0]
      : String(item.date).split('T')[0]
    if (!dateMap[date]) {
      dateMap[date] = { date, order_count: 0, units_sold: 0, net_sales_amount: 0 }
    }
    dateMap[date].order_count += item.order_count || 0
    dateMap[date].units_sold += item.units_sold || 0
    dateMap[date].net_sales_amount += item.net_sales_amount || 0
  })

  const sortedDates = Object.keys(dateMap).sort()
  const seriesData = sortedDates.map(date => dateMap[date].net_sales_amount)

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const item = params[0]
        return `${item.name}<br/>销售额: ${formatCurrency(item.value, 'USD')}`
      }
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
      data: sortedDates,
      axisLabel: {
        color: '#606266',
        formatter: (value) => value.split('-').slice(1).join('-')
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value) => `$${value.toLocaleString()}`,
        color: '#606266'
      }
    },
    series: [{
      name: '销售额',
      type: trendChartType.value,
      data: seriesData,
      itemStyle: { color: '#409EFF' },
      areaStyle: trendChartType.value === 'line' ? {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
          { offset: 1, color: 'rgba(64, 158, 255, 0.1)' }
        ])
      } : null
    }]
  }

  revenueChart.setOption(option, true)
}

const updateDistributionChart = () => {
  if (!distributionChart || channelDistributionData.value.length === 0) return

  const data = channelDistributionData.value.map(item => ({
    name: item.category || item.sales_channel || 'Unknown',
    value: item.net_sales_amount || 0
  }))

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (params) => `${params.name}<br/>销售额: ${formatCurrency(params.value, 'USD')}`
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'center',
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { fontSize: 12 }
    },
    series: [{
      name: '销售渠道',
      type: distributionChartType.value === 'pie' ? 'pie' : 'bar',
      radius: distributionChartType.value === 'pie' ? ['40%', '70%'] : null,
      data,
      itemStyle: {
        borderRadius: distributionChartType.value === 'bar' ? 4 : 0,
        color: (params) => {
          const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#A0A0FF', '#FFA0A0']
          return colors[params.dataIndex % colors.length]
        }
      },
      label: {
        show: distributionChartType.value === 'pie',
        formatter: '{b}: {d}%'
      }
    }]
  }

  if (distributionChartType.value === 'bar') {
    option.xAxis = {
      type: 'category',
      data: data.map(d => d.name),
      axisLabel: { color: '#606266' }
    }
    option.yAxis = {
      type: 'value',
      axisLabel: {
        formatter: (value) => `$${value.toLocaleString()}`,
        color: '#606266'
      }
    }
    option.series[0].type = 'bar'
  }

  distributionChart.setOption(option, true)
}

// ============ 事件处理 ============
const handleDimensionChange = () => {
  customDateRange.value = null
  refreshData()
}

const handleCustomDateChange = (dates) => {
  if (dates && dates.length === 2) {
    activeDimension.value = 'custom'
    refreshData()
  }
}

const clearCustomDate = () => {
  customDateRange.value = null
  activeDimension.value = 'all'
  refreshData()
}

const handleSkuPageChange = (page) => {
  skuPage.value = page
  fetchSkuList()
}

const handleSkuPageSizeChange = (size) => {
  skuPageSize.value = size
  skuPage.value = 1
  fetchSkuList()
}

const handleTopSortChange = () => {
  fetchChartsData()
}

const refreshReplenishment = () => {
  fetchReplenishmentData()
}

const viewSkuDetails = (sku) => {
  skuDetailData.value = { sku }
  skuDetailDialogVisible.value = true
  fetchSkuOrderDetails(sku)
}

// ============ 工具方法 ============
const refreshData = () => {
  fetchSummaryData()
  fetchSkuList()
  fetchChartsData()
  fetchReplenishmentData()
}

// 清空所有订单数据
const handleClearAll = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有订单数据吗？此操作不可恢复。',
      '清空确认',
      {
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    loading.value = true
    await apiService.orders.deleteAll()
    ElMessage.success('清空成功')
    refreshData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '清空失败')
    }
  } finally {
    loading.value = false
  }
}

const exportData = async () => {
  try {
    const params = {
      dimension: activeDimension.value,
      shop_id: selectedShopId.value || '',
      format: 'csv'
    }

    if (customDateRange.value && customDateRange.value.length === 2) {
      params.startDate = customDateRange.value[0]
      params.endDate = customDateRange.value[1]
    }

    const blob = await apiService.orders.exportSkuSummary(params)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `订单汇总报告_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
    console.error(error)
  }
}

const formatCurrency = (value, currency = 'USD') => {
  if (value === undefined || value === null) return currency === 'USD' ? '$0.00' : '¥0.00'
  const num = parseFloat(value)
  if (currency === 'USD' || currency === 'CAD' || currency === 'MXN') {
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `¥${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

const formatPercent = (value) => {
  if (value === undefined || value === null) return '-'
  return `${(value * 100).toFixed(1)}%`
}

const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDateShort = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

const getProductRankClass = (rank) => {
  if (rank <= 3) return 'rank-gold'
  if (rank <= 6) return 'rank-silver'
  return 'rank-bronze'
}

const getTrendTagType = (type) => {
  switch (type) {
    case 'success': return 'success'
    case 'warning': return 'warning'
    case 'danger': return 'danger'
    case 'info': return 'info'
    case 'primary': return 'primary'
    default: return 'info'
  }
}

const getTrendTooltip = (type) => {
  switch (type) {
    case 'success': return '近3天日均销量相比近7天日均增长超过50%，需求正在爆发'
    case 'warning': return '近7天日均销量相比近14天日均下降超过30%，需求开始下滑'
    case 'danger': return '近7天有销量，但最近2天无订单，可能存在断货风险'
    case 'info': return '近30天有销量，但近7天很低，属于长尾低频商品'
    case 'primary': return '近7天和近14天销量稳定，波动不大'
    default: return '常规状态'
  }
}

const getStatusTagType = (status) => {
  switch (status) {
    case 'Pending': return 'warning'
    case 'Unshipped':
    case 'Shipping': return 'warning'
    case 'Shipped': return 'success'
    case 'Cancelled': return 'danger'
    default: return 'info'
  }
}

// ============ 监听器 ============
watch(trendChartType, updateRevenueChart)
watch(distributionChartType, updateDistributionChart)

watch(selectedShopId, () => {
  refreshData()
})

// ============ 生命周期 ============
onMounted(() => {
  fetchShopList()
  refreshData()
  initCharts()
})

onUnmounted(() => {
  if (revenueChart) {
    revenueChart.dispose()
    revenueChart = null
  }
  if (distributionChart) {
    distributionChart.dispose()
    distributionChart = null
  }
})
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
  align-items: center;
  gap: 10px;
}

.dimension-card {
  margin-bottom: 16px;
}

.dimension-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
}

.dimension-tabs {
  flex: 1;
}

.date-range {
  display: flex;
  align-items: center;
  margin-left: 20px;
}

.data-coverage-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f4f4f5;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #606266;
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

.summary-card.pending-orders .summary-icon {
  background-color: #909399;
}

.summary-card.effective-rate .summary-icon {
  background-color: #00acc1;
}

.summary-item {
  display: flex;
  align-items: center;
  padding: 16px;
}

.summary-icon {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  color: white;
  font-size: 18px;
}

.summary-content {
  flex: 1;
}

.summary-value {
  font-size: 22px;
  font-weight: bold;
  color: #303133;
  line-height: 1.2;
  margin-bottom: 2px;
}

.summary-label {
  font-size: 12px;
  color: #909399;
}

.multi-currency-tip {
  font-size: 16px;
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

.empty-chart {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.products-card {
  margin-bottom: 20px;
  border-radius: 8px;
}

.products-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-rank {
  width: 28px;
  height: 28px;
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

/* 补货辅助 */
.replenishment-card {
  margin-bottom: 20px;
  border-radius: 8px;
}

.replenishment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.replenishment-section {
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  min-height: 300px;
}

.section-title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.sku-list {
  max-height: 260px;
  overflow-y: auto;
}

.sku-item {
  padding: 10px 12px;
  margin-bottom: 8px;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.sku-item:hover {
  background: #ecf5ff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.sku-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.sku-name {
  font-weight: 600;
  font-size: 13px;
  color: #303133;
}

.sku-sales {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
}

/* SKU 表格 */
.sku-card {
  margin-bottom: 20px;
  border-radius: 8px;
}

.sku-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sku-count {
  font-size: 13px;
  color: #909399;
}

.status-pending {
  color: #E6A23C;
}

.status-cancelled {
  color: #F56C6C;
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.sku-sales-summary {
  margin-bottom: 16px;
}

.detail-section-title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
  margin: 16px 0 8px;
  padding-left: 8px;
  border-left: 3px solid #409EFF;
}

.highlight-value {
  font-weight: 600;
  color: #409EFF;
}

.date-cell {
  font-size: 12px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .dimension-container {
    flex-direction: column;
    gap: 12px;
  }

  .date-range {
    margin-left: 0;
    width: 100%;
  }

  .chart-row .el-col {
    margin-bottom: 16px;
  }

  .summary-item {
    flex-direction: column;
    text-align: center;
    padding: 12px;
  }

  .summary-icon {
    margin-right: 0;
    margin-bottom: 8px;
  }
}
</style>