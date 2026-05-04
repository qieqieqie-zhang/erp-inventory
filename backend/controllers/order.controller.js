const FileParser = require('../utils/fileParser');
const OrderItemModel = require('../models/OrderItemModel');
const UploadLogModel = require('../models/UploadLogModel');

/**
 * 数字安全转换
 */
const parseNum = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  const str = String(v).replace(/,/g, '');
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
};

/**
 * 日期安全解析
 */
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * 计算日期范围
 * @param {string} dimension - 时间维度: all, yesterday, 3days, 7days, 14days, 30days
 * @returns {Object} - { startDate, endDate }
 */
function calculateDateRange(dimension) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  let startDate = null;
  const endDate = todayEnd;

  switch (dimension) {
    case 'all':
      startDate = null;
      break;
    case 'yesterday':
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 1);
      break;
    case '3days':
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 2);
      break;
    case '7days':
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6);
      break;
    case '14days':
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 13);
      break;
    case '30days':
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 29);
      break;
    default:
      startDate = null;
      break;
  }

  return { startDate, endDate };
}

/**
 * 计算 SKU 趋势标签
 */
function calculateSkuTrend(skuData) {
  const {
    sales_3days = 0,
    sales_7days = 0,
    sales_14days = 0,
    sales_30days = 0,
    last_order_time
  } = skuData;

  const dailyAvg3days = sales_3days / 3;
  const dailyAvg7days = sales_7days / 7;
  const dailyAvg14days = sales_14days / 14;

  // 断单风险：近7天有销量，但最近2天无订单
  if (sales_7days > 0 && last_order_time) {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 1);
    twoDaysAgo.setHours(0, 0, 0, 0);

    if (new Date(last_order_time) < twoDaysAgo) {
      return { trend: '断单风险', label: '断单风险', type: 'danger' };
    }
  }

  // 爆发增长：近3天日均 > 近7天日均 * 1.5
  if (sales_3days > 0 && dailyAvg3days > dailyAvg7days * 1.5) {
    return { trend: '爆发增长', label: '爆发增长', type: 'success' };
  }

  // 开始下滑：近7天日均 < 近14天日均 * 0.7
  if (dailyAvg7days < dailyAvg14days * 0.7 && sales_14days > 0) {
    return { trend: '开始下滑', label: '开始下滑', type: 'warning' };
  }

  // 长尾低频：近30天有销量，但近7天很低
  if (sales_30days > 0 && sales_7days <= 2) {
    return { trend: '长尾低频', label: '长尾低频', type: 'info' };
  }

  // 稳定热销：近7天和近14天都有销量，且波动不大
  if (sales_7days > 0 && sales_14days > 0) {
    const volatility = Math.abs(dailyAvg7days - dailyAvg14days) / dailyAvg14days;
    if (volatility < 0.3) {
      return { trend: '稳定热销', label: '稳定热销', type: 'primary' };
    }
  }

  // 无数据
  if (sales_30days === 0) {
    return { trend: '无销量', label: '无销量', type: 'info' };
  }

  // 默认
  return { trend: '常规', label: '常规', type: 'default' };
}

/**
 * 订单管理控制器
 */
class OrderController {
  /**
   * 上传订单报告
   */
  async upload(req, res) {
    try {
      const { shop_id } = req.body;

      if (!req.file) {
        return res.status(400).json({
          code: 400,
          message: '请选择要上传的文件',
          data: null
        });
      }

      if (!shop_id) {
        return res.status(400).json({
          code: 400,
          message: '请选择店铺',
          data: null
        });
      }

      const { path: filePath, originalname: filename } = req.file;

      let parsedData;
      try {
        parsedData = FileParser.autoParseFile(filePath);
      } catch (parseError) {
        return res.status(400).json({
          code: 400,
          message: `文件解析失败: ${parseError.message}`,
          data: null
        });
      }

      const orderIdColumn = ['amazon-order-id', 'amazon_order_id', 'order-id', 'order_id'].find(col =>
        parsedData.data.length > 0 && parsedData.data[0].hasOwnProperty(col)
      );

      if (!orderIdColumn) {
        return res.status(400).json({
          code: 400,
          message: '文件缺少订单号字段 (amazon-order-id)',
          data: null
        });
      }

      const validData = parsedData.data.filter(item => {
        const orderId = item[orderIdColumn];
        return orderId && String(orderId).trim() !== '';
      });

      const invalidData = parsedData.data.filter(item => {
        const orderId = item[orderIdColumn];
        return !orderId || String(orderId).trim() === '';
      });

      if (validData.length === 0) {
        return res.status(400).json({
          code: 400,
          message: '文件中没有有效的订单数据',
          data: null
        });
      }

      const uploadBatch = `ORD_NEW_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      try {
        await OrderItemModel.bulkInsert(validData, parseInt(shop_id), uploadBatch);
      } catch (dbError) {
        console.error('[OrderController] 数据库保存失败:', dbError);
        throw dbError;
      }

      let errorFile = null;
      if (invalidData.length > 0) {
        errorFile = FileParser.generateErrorFile(
          invalidData,
          process.env.UPLOAD_DIR || './uploads/errors'
        );
      }

      await UploadLogModel.createLog({
        userId: req.user.id,
        username: req.user.username,
        module: 'order',
        filename: filename,
        totalRecords: parsedData.data.length,
        successCount: validData.length,
        failCount: invalidData.length,
        errorFile: errorFile
      });

      const response = {
        code: 200,
        message: '上传成功',
        data: {
          total: parsedData.data.length,
          success: validData.length,
          fail: invalidData.length,
          batch: uploadBatch,
          errorFile: errorFile ? `/uploads/errors/${errorFile.split('/').pop()}` : null
        }
      };

      if (invalidData.length > 0) {
        response.message = '上传完成，但有部分数据无效';
        response.data.warning = `${invalidData.length} 条记录因订单号为空被忽略`;
      }

      res.json(response);
    } catch (error) {
      console.error('订单上传错误:', error);
      res.status(500).json({
        code: 500,
        message: `服务器内部错误: ${error.message}`,
        data: null
      });
    }
  }

  /**
   * 获取汇总统计
   */
  async getSummary(req, res) {
    try {
      const {
        dimension = 'all',
        startDate = '',
        endDate = '',
        shop_id = '',
        shop_code = ''
      } = req.query;

      let queryStartDate = null;
      let queryEndDate = null;

      if (startDate && endDate) {
        queryStartDate = new Date(startDate);
        queryEndDate = new Date(endDate);
        queryEndDate.setHours(23, 59, 59, 999);
      } else {
        const range = calculateDateRange(dimension);
        queryStartDate = range.startDate;
        queryEndDate = range.endDate;
      }

      const options = {
        storeId: shop_id ? parseInt(shop_id) : null,
        shopCode: shop_code,
        startDate: queryStartDate,
        endDate: queryEndDate
      };

      const [stats, statusBreakdown, currencyBreakdown] = await Promise.all([
        OrderItemModel.getStatsByDateRange(options),
        OrderItemModel.getOrderStatusBreakdown(options),
        OrderItemModel.getCurrencyBreakdown(options)
      ]);

      // 处理状态分布
      const statusMap = {};
      let pendingOrderCount = 0;
      let cancelledOrderCount = 0;
      let shippedOrderCount = 0;

      statusBreakdown.forEach(item => {
        statusMap[item.order_status] = {
          order_count: parseNum(item.order_count),
          units: parseNum(item.units)
        };
        if (item.order_status === 'Pending') pendingOrderCount = parseNum(item.order_count);
        if (item.order_status === 'Cancelled') cancelledOrderCount = parseNum(item.order_count);
        if (item.order_status === 'Shipped') shippedOrderCount = parseNum(item.order_count);
      });

      const orderCount = parseNum(stats.order_count);
      const netSalesAmount = parseNum(stats.net_sales_amount);
      const avgOrderValue = orderCount > 0 ? netSalesAmount / orderCount : 0;

      // 有效订单率
      const effectiveOrderRate = orderCount > 0 ? (orderCount - cancelledOrderCount) / orderCount : null;

      const coverage = await OrderItemModel.getDataCoverage(options.storeId);

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          order_count: orderCount,
          units_sold: parseNum(stats.units_sold),
          net_sales_amount: netSalesAmount,
          gross_sales_amount: parseNum(stats.gross_sales_amount),
          total_discount: parseNum(stats.total_discount),
          avg_order_value: avgOrderValue,
          effective_order_rate: effectiveOrderRate,

          pending_order_count: pendingOrderCount,
          cancelled_order_count: cancelledOrderCount,
          shipped_order_count: shippedOrderCount,
          status_breakdown: statusMap,

          currency_breakdown: currencyBreakdown,
          is_multi_currency: (parseNum(stats.currency_count)) > 1,

          data_coverage: {
            start_date: stats.data_start_date,
            end_date: stats.data_end_date
          },

          query: {
            dimension,
            start_date: queryStartDate,
            end_date: queryEndDate,
            shop_id: options.storeId
          }
        }
      });
    } catch (error) {
      console.error('获取订单汇总错误:', error);
      res.status(500).json({
        code: 500,
        message: `服务器内部错误: ${error.message}`,
        data: null
      });
    }
  }

  /**
   * 获取 SKU 销量汇总列表（增强版）
   */
  async getSkuList(req, res) {
    try {
      const {
        dimension = 'all',
        startDate = '',
        endDate = '',
        shop_id = '',
        shop_code = '',
        page = 1,
        pageSize = 100
      } = req.query;

      const options = {
        storeId: shop_id ? parseInt(shop_id) : null,
        shopCode: shop_code,
        endDate: endDate ? new Date(endDate) : null
      };

      // 获取多时间窗口销量数据
      const skuData = await OrderItemModel.getSkuMultiWindowSales(options);

      // 排序
      skuData.sort((a, b) => (b.net_sales_amount || 0) - (a.net_sales_amount || 0));

      // 添加趋势标签
      const enrichedSkuList = skuData.map(sku => {
        const trend = calculateSkuTrend(sku);
        return {
          ...sku,
          trend_label: trend.label,
          trend_type: trend.type
        };
      });

      // 分页
      const total = enrichedSkuList.length;
      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const paginatedList = enrichedSkuList.slice(offset, offset + parseInt(pageSize));

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          list: paginatedList,
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            total,
            totalPages: Math.ceil(total / parseInt(pageSize))
          }
        }
      });
    } catch (error) {
      console.error('获取SKU列表错误:', error);
      res.status(500).json({
        code: 500,
        message: `服务器内部错误: ${error.message}`,
        data: null
      });
    }
  }

  /**
   * 获取 SKU 订单明细
   */
  async getSkuDetails(req, res) {
    try {
      const { sku } = req.params;
      const {
        dimension = 'all',
        startDate = '',
        endDate = '',
        shop_id = '',
        shop_code = '',
        page = 1,
        pageSize = 50
      } = req.query;

      if (!sku) {
        return res.status(400).json({
          code: 400,
          message: '请提供SKU参数',
          data: null
        });
      }

      const options = {
        storeId: shop_id ? parseInt(shop_id) : null,
        shopCode: shop_code,
        endDate: endDate ? new Date(endDate) : null
      };

      // 获取扩展数据
      const extendedData = await OrderItemModel.getSkuDetailExtended(sku, options);

      // 获取趋势
      const trend = calculateSkuTrend(extendedData.salesSummary || {});

      // 计算辅助字段
      const salesChannel = extendedData.channelDistribution?.[0]?.sales_channel || null;
      const currency = extendedData.channelDistribution?.[0]?.currency || null;
      const avgUnitPrice = extendedData.salesSummary?.units_sold > 0
        ? extendedData.salesSummary.net_sales_amount / extendedData.salesSummary.units_sold
        : 0;
      const cancelledUnits = extendedData.statusDistribution
        ? extendedData.statusDistribution
            .filter(s => s.order_status === 'Cancelled')
            .reduce((sum, s) => sum + parseNum(s.total_quantity), 0)
        : 0;

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          sku,
          product_name: extendedData.recent7daysOrders?.[0]?.product_name || sku,
          trend,
          recent7daysOrders: extendedData.recent7daysOrders || [],
          statusDistribution: extendedData.statusDistribution || [],
          channelDistribution: extendedData.channelDistribution || [],
          salesSummary: {
            ...extendedData.salesSummary,
            trend_label: trend.label,
            trend_type: trend.type
          },
          // 辅助字段
          salesChannel,
          currency,
          avgUnitPrice,
          cancelledUnits
        }
      });
    } catch (error) {
      console.error('获取SKU订单明细错误:', error);
      res.status(500).json({
        code: 500,
        message: `服务器内部错误: ${error.message}`,
        data: null
      });
    }
  }

  /**
   * 获取图表数据
   */
  async getChartsData(req, res) {
    try {
      const {
        dimension = 'all',
        startDate = '',
        endDate = '',
        shop_id = '',
        shop_code = '',
        sortBy = 'units_sold'
      } = req.query;

      const options = {
        storeId: shop_id ? parseInt(shop_id) : null,
        shopCode: shop_code,
        endDate: endDate ? new Date(endDate) : null
      };

      const [dailyTrend, channelDistribution, topProducts] = await Promise.all([
        OrderItemModel.getDailySalesTrend(options),
        OrderItemModel.getChannelDistribution({ ...options, groupBy: 'sales_channel' }),
        OrderItemModel.getTopProducts(options, 10)
      ]);

      // 为 topProducts 添加趋势和排名
      const skuData = await OrderItemModel.getSkuMultiWindowSales(options);
      const skuMap = {};
      skuData.forEach(s => { skuMap[s.sku] = s; });

      let sortedTopProducts = [...topProducts].map((p, idx) => {
        const skuInfo = skuMap[p.sku] || {};
        const trend = calculateSkuTrend(skuInfo);
        return {
          ...p,
          rank: idx + 1,
          trend_label: trend.label,
          trend_type: trend.type,
          sales_3days: skuInfo.sales_3days || 0,
          sales_7days: skuInfo.sales_7days || 0,
          sales_14days: skuInfo.sales_14days || 0,
          sales_30days: skuInfo.sales_30days || 0,
          daily_avg_7days: skuInfo.daily_avg_7days || 0,
          last_order_time: skuInfo.last_order_time || null
        };
      });

      // 排序
      if (sortBy === 'net_sales_amount') {
        sortedTopProducts.sort((a, b) => (b.net_sales_amount || 0) - (a.net_sales_amount || 0));
      } else if (sortBy === 'order_count') {
        sortedTopProducts.sort((a, b) => (b.order_count || 0) - (a.order_count || 0));
      } else {
        sortedTopProducts.sort((a, b) => (b.units_sold || 0) - (a.units_sold || 0));
      }

      // 重新编号
      sortedTopProducts = sortedTopProducts.map((p, idx) => ({ ...p, rank: idx + 1 }));

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          daily_trend: dailyTrend,
          channel_distribution: channelDistribution,
          top_products: sortedTopProducts
        }
      });
    } catch (error) {
      console.error('获取图表数据错误:', error);
      res.status(500).json({
        code: 500,
        message: `服务器内部错误: ${error.message}`,
        data: null
      });
    }
  }

  /**
   * 获取补货辅助数据
   */
  async getReplenishment(req, res) {
    try {
      const {
        dimension = 'all',
        endDate = '',
        shop_id = '',
        shop_code = '',
        limit = 10
      } = req.query;

      const options = {
        storeId: shop_id ? parseInt(shop_id) : null,
        shopCode: shop_code,
        endDate: endDate ? new Date(endDate) : null,
        limit: parseInt(limit) || 10
      };

      const data = await OrderItemModel.getReplenishmentAuxiliary(options);

      // 添加趋势标签
      const enrichWithTrend = (list) => list.map(item => {
        const trend = calculateSkuTrend(item);
        return {
          ...item,
          trend_label: trend.label,
          trend_type: trend.type
        };
      });

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          highDemandSkus: enrichWithTrend(data.highDemandSkus),
          risingSkus: enrichWithTrend(data.risingSkus),
          stockOutRiskSkus: enrichWithTrend(data.stockOutRiskSkus)
        }
      });
    } catch (error) {
      console.error('获取补货辅助数据错误:', error);
      res.status(500).json({
        code: 500,
        message: `服务器内部错误: ${error.message}`,
        data: null
      });
    }
  }

  /**
   * 导出 SKU 汇总数据
   */
  async exportSkuSummary(req, res) {
    try {
      const {
        dimension = 'all',
        startDate = '',
        endDate = '',
        shop_id = '',
        format = 'json'
      } = req.query;

      const options = {
        storeId: shop_id ? parseInt(shop_id) : null,
        endDate: endDate ? new Date(endDate) : null
      };

      const skuData = await OrderItemModel.getSkuMultiWindowSales(options);

      // 排序
      skuData.sort((a, b) => (b.net_sales_amount || 0) - (a.net_sales_amount || 0));

      // 添加趋势
      const enrichedSkuList = skuData.map(sku => {
        const trend = calculateSkuTrend(sku);
        return {
          ...sku,
          trend_label: trend.label,
          trend_type: trend.type
        };
      });

      if (format === 'csv') {
        const headers = [
          'SKU', '商品名称', 'ASIN', '销售渠道', '币种',
          '近3天销量', '近7天销量', '近14天销量', '近30天销量', '近7天日均',
          '订单数', '销售数量', '销售额', '平均售价',
          'Pending', '已取消', '最近订单时间', '趋势标签'
        ];

        const csvRows = [headers.join(',')];

        enrichedSkuList.forEach(item => {
          const row = [
            item.sku,
            `"${item.product_name || ''}"`,
            item.asin || '',
            item.sales_channel || '',
            item.currency || '',
            item.sales_3days || 0,
            item.sales_7days || 0,
            item.sales_14days || 0,
            item.sales_30days || 0,
            item.daily_avg_7days ? item.daily_avg_7days.toFixed(2) : '0.00',
            item.order_count || 0,
            item.units_sold || 0,
            item.net_sales_amount ? item.net_sales_amount.toFixed(2) : '0.00',
            item.avg_unit_price ? item.avg_unit_price.toFixed(2) : '0.00',
            item.pending_units || 0,
            item.cancelled_units || 0,
            item.last_order_time ? new Date(item.last_order_time).toISOString().split('T')[0] : '',
            item.trend_label || ''
          ];
          csvRows.push(row.join(','));
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=order_sku_summary_${Date.now()}.csv`);
        return res.send(csvRows.join('\n'));
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=order_sku_summary_${Date.now()}.json`);
        return res.json(enrichedSkuList);
      }
    } catch (error) {
      console.error('导出SKU汇总错误:', error);
      res.status(500).json({
        code: 500,
        message: `导出失败: ${error.message}`,
        data: null
      });
    }
  }

  /**
   * 清空所有订单数据
   */
  async deleteAll(req, res) {
    try {
      await OrderItemModel.deleteAll();
      res.json({ code: 200, message: '清空成功', data: null });
    } catch (error) {
      console.error('清空订单错误:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  }

  /**
   * 按SKU删除订单数据
   */
  async deleteBySku(req, res) {
    try {
      const { sku } = req.params;
      if (!sku) {
        return res.status(400).json({ code: 400, message: 'SKU不能为空', data: null });
      }
      const deleted = await OrderItemModel.deleteBySku(sku);
      if (!deleted) {
        return res.status(404).json({ code: 404, message: '未找到该SKU的订单', data: null });
      }
      res.json({ code: 200, message: '删除成功', data: null });
    } catch (error) {
      console.error('删除订单错误:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  }
}

module.exports = new OrderController();